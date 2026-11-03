-- =============================================================================
-- Migration: 20261103150000_education_multicurrency_discounts_direct_fees.sql
-- Ferex Education: Multi-currency (PLN/GBP), banner images, discounts, and direct fees
-- =============================================================================

BEGIN;

-- 1. Relax fee configuration currency check to support PLN and GBP alongside INR, EUR, USD
CREATE OR REPLACE FUNCTION public.guard_education_fee_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fee jsonb;
  amount_text text;
BEGIN
  IF NEW.key = 'fee_config' THEN
    IF NOT public.education_finance_admin() AND auth.role() <> 'service_role' THEN 
      RAISE EXCEPTION 'Only finance admins may configure education fees'; 
    END IF;
    IF NEW.value ? 'education_fees' AND jsonb_typeof(NEW.value->'education_fees') <> 'array' THEN 
      RAISE EXCEPTION 'Fee configuration must be a list'; 
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(NEW.value->'education_fees','[]')) f 
      GROUP BY f->>'id' HAVING count(*) > 1
    ) THEN 
      RAISE EXCEPTION 'Fee identifiers must be unique'; 
    END IF;
    
    FOR fee IN SELECT * FROM jsonb_array_elements(coalesce(NEW.value->'education_fees', '[]')) LOOP
      IF nullif(btrim(fee->>'id'),'') IS NULL 
         OR nullif(btrim(fee->>'title'),'') IS NULL 
         OR coalesce((fee->>'amount')::numeric,-1) < 0 
         OR (fee->>'amount')::numeric = 'NaN'::numeric 
         OR coalesce((fee->>'stage')::integer,0) NOT BETWEEN 1 AND 12 
         OR coalesce(fee->>'currency','') NOT IN ('INR','EUR','USD','GBP','PLN') 
         OR coalesce(fee->>'timing','') NOT IN ('before','after') 
         OR coalesce(fee->>'recipient','') NOT IN ('ferex','direct_third_party') THEN 
        RAISE EXCEPTION 'Invalid fee configuration'; 
      END IF;
      
      IF coalesce((fee->>'tax_rate_percent')::numeric,0) NOT BETWEEN 0 AND 100 THEN 
        RAISE EXCEPTION 'Invalid tax rate'; 
      END IF;
      
      FOR amount_text IN SELECT value FROM jsonb_each_text(coalesce(fee->'countryAmounts','{}')) LOOP
        IF amount_text::numeric < 0 OR amount_text::numeric = 'NaN'::numeric THEN 
          RAISE EXCEPTION 'Country-specific fees must be non-negative'; 
        END IF;
      END LOOP;
      
      IF lower(fee->>'title') ~ '(university|tuition)' AND fee->>'recipient' <> 'direct_third_party' THEN 
        RAISE EXCEPTION 'University fees must remain direct payments'; 
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

-- 2. Add multi-currency and media columns to universities table
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tuition_fee_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS tuition_fee_min NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee_max NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee_pln NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee_eur NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee_usd NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee_inr NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scholarship_percentage_max NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_payment_instructions TEXT DEFAULT '';

-- Backfill banner_image_url from image_url where missing
UPDATE public.universities
SET banner_image_url = image_url
WHERE (banner_image_url IS NULL OR banner_image_url = '') AND image_url IS NOT NULL AND image_url <> '';

-- 3. Add Discount, Scholarship & Direct Payment tracking to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_direct_payment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_recipient_institution TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS direct_proof_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS scholarship_percentage NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scholarship_provider TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS exchange_rate_to_inr NUMERIC(12, 4) DEFAULT 1.0;

-- 4. Create Student Fee Overrides & Scholarships Table (Per-Student Customization)
CREATE TABLE IF NOT EXISTS public.education_student_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fee_id TEXT NOT NULL,
  custom_amount NUMERIC(12, 2) NOT NULL CHECK (custom_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'EUR', 'USD', 'GBP', 'PLN')),
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  discount_reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, fee_id)
);

ALTER TABLE public.education_student_fee_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "education_student_fee_overrides_read" ON public.education_student_fee_overrides;
CREATE POLICY "education_student_fee_overrides_read" ON public.education_student_fee_overrides
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.education_finance_admin() OR
    public.get_auth_user_role() IN ('staff', 'counselor')
  );

DROP POLICY IF EXISTS "education_student_fee_overrides_admin_write" ON public.education_student_fee_overrides;
CREATE POLICY "education_student_fee_overrides_admin_write" ON public.education_student_fee_overrides
  FOR ALL TO authenticated
  USING (public.education_finance_admin() OR auth.role() = 'service_role')
  WITH CHECK (public.education_finance_admin() OR auth.role() = 'service_role');

-- 5. Direct University/Govt Payment Submissions Table
CREATE TABLE IF NOT EXISTS public.education_direct_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  fee_category TEXT NOT NULL CHECK (fee_category IN ('university_tuition', 'vfs_visa_fee', 'university_application', 'embassy_legalization', 'other_direct')),
  institution_name TEXT NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
  currency TEXT NOT NULL CHECK (currency IN ('EUR', 'PLN', 'USD', 'GBP', 'INR')),
  payment_method TEXT NOT NULL DEFAULT 'International Wire / Flywire',
  transaction_ref TEXT NOT NULL,
  payment_date DATE NOT NULL,
  receipt_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (verification_status IN ('Pending Verification', 'Verified', 'Rejected')),
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  reviewer_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.education_direct_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "education_direct_payments_read" ON public.education_direct_payments;
CREATE POLICY "education_direct_payments_read" ON public.education_direct_payments
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.education_finance_admin() OR
    public.get_auth_user_role() IN ('staff', 'counselor')
  );

DROP POLICY IF EXISTS "education_direct_payments_student_insert" ON public.education_direct_payments;
CREATE POLICY "education_direct_payments_student_insert" ON public.education_direct_payments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "education_direct_payments_admin_update" ON public.education_direct_payments;
CREATE POLICY "education_direct_payments_admin_update" ON public.education_direct_payments
  FOR UPDATE TO authenticated
  USING (public.education_finance_admin() OR auth.role() = 'service_role')
  WITH CHECK (public.education_finance_admin() OR auth.role() = 'service_role');

-- 6. Grant Counselors & Staff read access to payment status of assigned students
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_counselor TEXT DEFAULT '';

CREATE OR REPLACE FUNCTION public.is_student_counselor(p_student_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_student_id AND (
      assigned_counselor = (SELECT email FROM public.users WHERE id = auth.uid()) OR
      assigned_counselor = (SELECT full_name FROM public.users WHERE id = auth.uid())
    )
  );
$$;

DROP POLICY IF EXISTS "payments_counselor_read" ON public.payments;
CREATE POLICY "payments_counselor_read" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.education_finance_admin() OR
    student_id = auth.uid() OR
    (public.get_auth_user_role() IN ('staff', 'counselor') AND public.is_student_counselor(student_id))
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
