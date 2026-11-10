-- Migration: 20261110130000_education_comprehensive_fixes_and_schema.sql
-- Description: Align public.users columns, create legalization_records table, and update RLS policies for counselor & staff roles

-- 1. Ensure public.users has all student profile columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_country TEXT;

-- 2. Create public.legalization_records table if not exists (matching legalization API expectations)
CREATE TABLE IF NOT EXISTS public.legalization_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT,
  country TEXT NOT NULL DEFAULT 'Poland',
  authority TEXT NOT NULL DEFAULT 'NAWA (Polish National Agency)',
  authority_acronym TEXT NOT NULL DEFAULT 'NAWA',
  ref_no TEXT,
  nawa_ref_no TEXT,
  document_type TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Submitted',
  submission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_date TIMESTAMPTZ,
  notes TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legalization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legalization_records_admin_all" ON public.legalization_records
  FOR ALL TO authenticated
  USING (
    public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
  );

CREATE POLICY "legalization_records_student_select" ON public.legalization_records
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Also grant public/anon access for service operations if needed
GRANT ALL ON public.legalization_records TO authenticated;
GRANT ALL ON public.legalization_records TO service_role;

-- 3. Update existing RLS policies to grant full access to 'counselor' and 'staff'

-- Applications
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;
CREATE POLICY "applications_admin_all" ON public.applications FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Offer Letters
DROP POLICY IF EXISTS "letters_admin_all" ON public.offer_letters;
CREATE POLICY "letters_admin_all" ON public.offer_letters FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Final Acceptance
DROP POLICY IF EXISTS "final_acceptance_admin_all" ON public.final_acceptance;
CREATE POLICY "final_acceptance_admin_all" ON public.final_acceptance FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Student Documents
DROP POLICY IF EXISTS "documents_admin_all" ON public.student_documents;
CREATE POLICY "documents_admin_all" ON public.student_documents FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Payments
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Invoices
DROP POLICY IF EXISTS "invoices_admin_all" ON public.invoices;
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Receipts
DROP POLICY IF EXISTS "receipts_admin_all" ON public.receipts;
CREATE POLICY "receipts_admin_all" ON public.receipts FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Visa Applications
DROP POLICY IF EXISTS "visa_admin_all" ON public.visa_applications;
CREATE POLICY "visa_admin_all" ON public.visa_applications FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Pre-departure Checklists
DROP POLICY IF EXISTS "checklists_admin_all" ON public.pre_departure_checklists;
CREATE POLICY "checklists_admin_all" ON public.pre_departure_checklists FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Support Tickets
DROP POLICY IF EXISTS "tickets_admin_all" ON public.support_tickets;
CREATE POLICY "tickets_admin_all" ON public.support_tickets FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Notifications
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
CREATE POLICY "notifications_all" ON public.notifications FOR ALL TO authenticated USING (
  user_id = auth.uid() OR user_id IS NULL OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  true
);

-- Meetings
DROP POLICY IF EXISTS "meetings_all" ON public.meetings;
CREATE POLICY "meetings_all" ON public.meetings FOR ALL TO authenticated USING (
  student_id = auth.uid() OR host_id = auth.uid() OR participant_id = auth.uid() OR student_id IS NULL OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  true
);

-- Chat Conversations
DROP POLICY IF EXISTS "chat_conv_access" ON public.chat_conversations;
CREATE POLICY "chat_conv_access" ON public.chat_conversations FOR ALL TO authenticated USING (
  student_id = auth.uid() OR counselor_id = auth.uid() OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
) WITH CHECK (
  student_id = auth.uid() OR counselor_id = auth.uid() OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);

-- Allow education_admin to manage staff and students in public.users
DROP POLICY IF EXISTS "education_admin_manage_users" ON public.users;
CREATE POLICY "education_admin_manage_users" ON public.users FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);

