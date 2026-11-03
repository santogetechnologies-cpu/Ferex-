-- Education billing: authenticated UPI submissions, admin-only settlement,
-- atomic split receipts and immutable accounting history.
BEGIN;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS billing_application_id uuid REFERENCES public.applications(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tax_rate_percent numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_rate_percent numeric;

CREATE OR REPLACE FUNCTION public.education_finance_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.get_auth_user_role() IN ('admin', 'education_admin', 'education', 'central', 'superadmin', 'super_admin'), false)
$$;

-- A dedicated, numbered workflow avoids interpreting legacy four-step visa
-- records as the twelve education stages used by fee configuration.
CREATE TABLE IF NOT EXISTS public.education_workflow_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage_number integer NOT NULL CHECK (stage_number BETWEEN 1 AND 12), stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  notes text NOT NULL DEFAULT '', completed_at timestamptz,
  UNIQUE (student_id, stage_number)
);
ALTER TABLE public.education_workflow_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY education_workflow_read ON public.education_workflow_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.education_finance_admin() OR public.get_auth_user_role() IN ('staff', 'counselor'));
CREATE POLICY education_workflow_manage ON public.education_workflow_progress FOR ALL TO authenticated
  USING (public.education_finance_admin()) WITH CHECK (public.education_finance_admin());
GRANT SELECT, INSERT, UPDATE ON public.education_workflow_progress TO authenticated;

CREATE TABLE IF NOT EXISTS public.education_student_preferences (
  student_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  country text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.education_student_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY education_preferences_read ON public.education_student_preferences FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.education_finance_admin());
CREATE POLICY education_preferences_write ON public.education_student_preferences FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.education_finance_admin())
  WITH CHECK (student_id = auth.uid() OR public.education_finance_admin());
GRANT SELECT, INSERT, UPDATE ON public.education_student_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_education_destination()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.destinations WHERE lower(btrim(name)) = lower(btrim(NEW.country)))
     AND NOT EXISTS (SELECT 1 FROM public.universities WHERE lower(btrim(country)) = lower(btrim(NEW.country)) AND is_active) THEN
    RAISE EXCEPTION 'Choose a registered study destination';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER education_destination_guard BEFORE INSERT OR UPDATE ON public.education_student_preferences FOR EACH ROW EXECUTE FUNCTION public.guard_education_destination();

CREATE TABLE IF NOT EXISTS public.education_service_agreements (
  student_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  body jsonb NOT NULL CHECK (coalesce(body->>'status' = 'Signed' AND length(body->>'signature_data') > 1, false)),
  signed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coalesce(body->>'student_id' = student_id::text, false))
);
ALTER TABLE public.education_service_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY education_agreement_read ON public.education_service_agreements FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.education_finance_admin());
CREATE POLICY education_agreement_sign ON public.education_service_agreements FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.education_finance_admin());
GRANT SELECT, INSERT ON public.education_service_agreements TO authenticated;

-- Retain signed agreements already persisted by the old console.
INSERT INTO public.education_service_agreements (student_id, body)
SELECT u.id, c.value FROM public.system_config c JOIN public.users u ON c.key = 'agreement_' || u.id::text
WHERE c.value->>'status' = 'Signed' AND length(c.value->>'signature_data') > 1 AND c.value->>'student_id' = u.id::text
ON CONFLICT (student_id) DO NOTHING;

-- Backward-compatible fee resolution until an admin first saves the new editor.
CREATE OR REPLACE FUNCTION public.education_configured_fees(cfg jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE fees jsonb; c jsonb; stage integer;
BEGIN
  IF jsonb_typeof(cfg->'education_fees') = 'array' THEN RETURN cfg->'education_fees'; END IF;
  fees := jsonb_build_array(
    jsonb_build_object('id','registration','title','Advanced Registration Fee','enabled',coalesce((cfg->>'advance_registration_fee_enabled')::boolean,true),'amount',coalesce((cfg->>'advance_registration_fee_amount')::numeric,(cfg->>'advance_registration_fee_inr')::numeric,1500),'currency',coalesce(cfg->>'advance_registration_fee_currency','INR'),'recipient','ferex','stage',3,'timing','before'),
    jsonb_build_object('id','agency','title','Separate Agency Fee','enabled',coalesce((cfg->>'separate_agency_fee_enabled')::boolean,true),'amount',coalesce((cfg->>'agency_fee_amount')::numeric,25000),'currency',coalesce(cfg->>'agency_fee_currency','INR'),'recipient','ferex','stage',10,'timing','after'),
    jsonb_build_object('id','vfs','title','VFS / Visa Gov Fee','enabled',true,'amount',coalesce(nullif(regexp_replace(coalesce(cfg->>'default_vfs_fee','15000'),'[^0-9.]','','g'),''),'0')::numeric,'currency','INR','recipient','direct_third_party','stage',9,'timing','before'),
    jsonb_build_object('id','visa-documents','title','Cost for Documents for Visa','enabled',coalesce((cfg->>'visa_documents_fee_enabled')::boolean,true),'amount',coalesce((cfg->>'visa_documents_fee_amount')::numeric,15000),'currency',coalesce(cfg->>'visa_documents_fee_currency','INR'),'recipient','ferex','stage',7,'timing','after')
  );
  FOR c IN SELECT * FROM jsonb_array_elements(coalesce(cfg->'custom_payments','[]')) LOOP
    stage := CASE c->>'trigger_stage' WHEN 'before_reg' THEN 3 WHEN 'after_agreement' THEN 2 WHEN 'before_application' THEN 6 WHEN 'after_offer' THEN 7 WHEN 'before_visa' THEN 9 WHEN 'after_visa' THEN 10 WHEN 'pre_departure' THEN 11 ELSE 1 END;
    fees := fees || jsonb_build_array(c || jsonb_build_object('stage', stage, 'timing',CASE WHEN c->>'trigger_stage' LIKE 'after%' THEN 'after' ELSE 'before' END));
  END LOOP;
  RETURN fees;
END $$;

-- Replace permissive legacy policies; clients cannot approve their own payments.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' LOOP
    EXECUTE format('DROP POLICY %I ON public.payments', p.policyname);
  END LOOP;
END $$;
CREATE POLICY education_payment_read ON public.payments FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.education_finance_admin() OR public.get_auth_user_role() IN ('staff', 'counselor'));
CREATE POLICY education_payment_insert ON public.payments FOR INSERT TO authenticated
WITH CHECK (public.education_finance_admin() OR (student_id = auth.uid() AND status = 'Pending Verification' AND payment_method = 'UPI' AND currency = 'INR' AND paid_at IS NULL));
CREATE POLICY education_payment_update ON public.payments FOR UPDATE TO authenticated
USING (public.education_finance_admin()) WITH CHECK (public.education_finance_admin());
-- No client DELETE policy: corrections retain the audit trail.

DO $$ DECLARE p record; t text; BEGIN
  FOREACH t IN ARRAY ARRAY['invoices','receipts'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY education_document_read ON public.%I FOR SELECT TO authenticated USING (student_id=auth.uid() OR public.education_finance_admin())',t);
    EXECUTE format('CREATE POLICY education_document_manage ON public.%I FOR ALL TO authenticated USING (public.education_finance_admin()) WITH CHECK (public.education_finance_admin())',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS education_payment_reference_unique
ON public.payments (lower(btrim(utr_number)), payment_method)
WHERE payment_type LIKE 'education:%' AND btrim(coalesce(utr_number, '')) <> ''
  AND status NOT IN ('Rejected', 'Cancelled', 'Refunded');

CREATE OR REPLACE FUNCTION public.guard_education_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; fee jsonb; app public.applications; country_name text; expected numeric;
        committed numeric; reached integer := 1; required_stage integer; agreement jsonb;
BEGIN
  IF NEW.amount <= 0 OR NEW.amount = 'NaN'::numeric THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NOT public.education_finance_admin() AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Only finance admins can review payments'; END IF;
    IF (NEW.amount, NEW.currency, NEW.student_id, NEW.payment_type, NEW.utr_number, NEW.payment_method, NEW.tax_rate_percent)
       IS DISTINCT FROM (OLD.amount, OLD.currency, OLD.student_id, OLD.payment_type, OLD.utr_number, OLD.payment_method, OLD.tax_rate_percent) THEN
      RAISE EXCEPTION 'Recorded payment details cannot be overwritten; use a documented adjustment';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.payment_type NOT LIKE 'education:%' THEN
    IF NOT public.education_finance_admin() THEN RAISE EXCEPTION 'Use a configured education fee'; END IF;
    IF lower(coalesce(NEW.title, '') || ' ' || NEW.payment_type) ~ '(tuition|university)' THEN RAISE EXCEPTION 'University fees are paid directly to the university'; END IF;
    RETURN NEW;
  END IF;
  SELECT value INTO cfg FROM public.system_config WHERE key = 'fee_config';
  SELECT f INTO fee FROM jsonb_array_elements(public.education_configured_fees(cfg)) f
    WHERE f->>'id' = substring(NEW.payment_type from 11);
  IF fee IS NULL OR NOT coalesce((fee->>'enabled')::boolean, false) OR fee->>'recipient' <> 'ferex' THEN
    RAISE EXCEPTION 'This fee is disabled, direct-pay, or not configured. Ask education admin to save fee configuration.';
  END IF;
  IF lower(fee->>'title') ~ '(tuition|university)' THEN RAISE EXCEPTION 'University payments cannot be collected by Ferex'; END IF;
  IF NEW.currency <> fee->>'currency' THEN RAISE EXCEPTION 'Payment currency does not match the configured fee'; END IF;
  IF NEW.billing_application_id IS NOT NULL THEN
    SELECT * INTO app FROM public.applications WHERE id = NEW.billing_application_id AND student_id = NEW.student_id;
    IF app.id IS NULL THEN RAISE EXCEPTION 'Application does not belong to this student'; END IF;
  ELSE
    SELECT * INTO app FROM public.applications WHERE student_id = NEW.student_id AND university_id IS NOT NULL
      AND status NOT IN ('Rejected', 'Withdrawn', 'Closed') ORDER BY created_at DESC LIMIT 1;
  END IF;
  SELECT country INTO country_name FROM public.universities WHERE id = app.university_id;
  IF country_name IS NULL THEN SELECT country INTO country_name FROM public.education_student_preferences WHERE student_id = NEW.student_id; END IF;
  expected := (fee->>'amount')::numeric;
  IF country_name IS NULL AND coalesce(fee->'countryAmounts', '{}') <> '{}'::jsonb THEN RAISE EXCEPTION 'Select a destination before paying this fee'; END IF;
  SELECT coalesce((SELECT value::numeric FROM jsonb_each_text(coalesce(fee->'countryAmounts', '{}'))
    WHERE lower(btrim(key)) = lower(btrim(country_name)) LIMIT 1), expected) INTO expected;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.student_id::text || NEW.payment_type, 0));
  IF btrim(coalesce(NEW.utr_number,'')) = '' THEN RAISE EXCEPTION 'A transaction reference or cash receipt number is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(NEW.utr_number)) || NEW.payment_method, 0));
  IF EXISTS (SELECT 1 FROM public.payments WHERE lower(btrim(utr_number))=lower(btrim(NEW.utr_number)) AND payment_method=NEW.payment_method AND status NOT IN ('Rejected','Cancelled','Refunded')) THEN
    RAISE EXCEPTION 'This transaction reference was already recorded';
  END IF;
  SELECT coalesce(sum(CASE WHEN status = 'Partial' THEN partial_amount ELSE amount END), 0) INTO committed
    FROM public.payments WHERE student_id = NEW.student_id AND currency = NEW.currency
      AND status IN ('Paid', 'Verified', 'Pending Verification', 'Partial')
      AND (payment_type = NEW.payment_type OR (payment_type NOT LIKE 'education:%' AND
        CASE fee->>'id'
          WHEN 'registration' THEN lower(title || ' ' || payment_type) ~ '(registration|advance|audit deposit)'
          WHEN 'agency' THEN lower(title || ' ' || payment_type) ~ '(agency|service charge)'
          WHEN 'vfs' THEN lower(title || ' ' || payment_type) ~ '(vfs|visa gov|consular)'
          WHEN 'visa-documents' THEN lower(title || ' ' || payment_type) ~ '(documents? for visa|visa documents)'
          ELSE lower(btrim(title)) = lower(btrim(fee->>'title')) END));
  IF committed + NEW.amount > expected THEN RAISE EXCEPTION 'Payment exceeds the remaining configured fee'; END IF;
  NEW.title := fee->>'title';
  NEW.tax_rate_percent := coalesce((fee->>'tax_rate_percent')::numeric, 0);
  IF NOT public.education_finance_admin() THEN
    IF NEW.student_id <> auth.uid() OR NEW.status <> 'Pending Verification' OR NEW.payment_method <> 'UPI' OR NEW.currency <> 'INR' THEN RAISE EXCEPTION 'Students may only submit their own UPI payment for verification'; END IF;
    IF NOT coalesce((cfg->'payment_gateways'->>'phonepe_upi_enabled')::boolean, false) THEN RAISE EXCEPTION 'Student UPI payments are disabled'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.system_config WHERE key = 'payment_gateways' AND (value->'upi'->>'enabled')::boolean AND (value->'divisions'->'education'->>'allowUpi')::boolean) THEN RAISE EXCEPTION 'UPI gateway is not enabled'; END IF;
    SELECT greatest(1, coalesce(max(stage_number), 1)) INTO reached FROM public.education_workflow_progress WHERE student_id = NEW.student_id AND status = 'Completed';
    SELECT body INTO agreement FROM public.education_service_agreements WHERE student_id = NEW.student_id;
    IF agreement->>'status' = 'Signed' THEN reached := greatest(reached, 2); END IF;
    IF app.id IS NOT NULL AND app.status <> 'Draft' THEN reached := greatest(reached, 6); END IF;
    IF nullif(app.offer_letter_url, '') IS NOT NULL OR app.status IN ('Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Enrolled') THEN reached := greatest(reached, 7); END IF;
    IF nullif(app.final_acceptance_url, '') IS NOT NULL THEN reached := greatest(reached, 8); END IF;
    IF app.status IN ('Visa Processing', 'Visa Approved', 'Enrolled') THEN reached := greatest(reached, 9); END IF;
    IF app.status IN ('Visa Approved', 'Enrolled') THEN reached := greatest(reached, 10); END IF;
    IF app.status = 'Enrolled' THEN reached := 12; END IF;
    required_stage := (fee->>'stage')::integer - CASE WHEN fee->>'timing' = 'before' THEN 1 ELSE 0 END;
    IF reached < required_stage THEN RAISE EXCEPTION 'This fee is not yet due in the student workflow'; END IF;
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER education_payment_guard BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_education_payment();

-- Receipt and invoice creation succeeds or rolls back with the payment itself.
CREATE OR REPLACE FUNCTION public.issue_education_payment_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('Paid', 'Verified') AND NEW.payment_type LIKE 'education:%' THEN
    INSERT INTO public.invoices (student_id, payment_id, invoice_no, description, amount, currency, status, tax_rate_percent)
      VALUES (NEW.student_id, NEW.id, 'EDU-INV-' || NEW.id, NEW.title, NEW.amount, NEW.currency, 'Paid', NEW.tax_rate_percent) ON CONFLICT (invoice_no) DO NOTHING;
    INSERT INTO public.receipts (student_id, payment_id, receipt_no, description, amount, currency, payment_method)
      VALUES (NEW.student_id, NEW.id, 'EDU-RCP-' || NEW.id, NEW.title, NEW.amount, NEW.currency, NEW.payment_method) ON CONFLICT (receipt_no) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER education_payment_documents AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.issue_education_payment_documents();

CREATE OR REPLACE FUNCTION public.guard_education_fee_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fee jsonb; amount_text text;
BEGIN
  IF NEW.key IN ('fee_config', 'ferex_fee_governance_config') THEN
    IF NOT public.education_finance_admin() AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Only finance admins may configure education fees'; END IF;
    IF NEW.value ? 'education_fees' AND jsonb_typeof(NEW.value->'education_fees') <> 'array' THEN RAISE EXCEPTION 'Fee configuration must be a list'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(NEW.value->'education_fees','[]')) f GROUP BY f->>'id' HAVING count(*) > 1) THEN RAISE EXCEPTION 'Fee identifiers must be unique'; END IF;
    FOR fee IN SELECT * FROM jsonb_array_elements(coalesce(NEW.value->'education_fees', '[]')) LOOP
      IF nullif(btrim(fee->>'id'),'') IS NULL OR nullif(btrim(fee->>'title'),'') IS NULL OR coalesce((fee->>'amount')::numeric,-1) < 0 OR (fee->>'amount')::numeric = 'NaN'::numeric OR coalesce((fee->>'stage')::integer,0) NOT BETWEEN 1 AND 12 OR coalesce(fee->>'currency','') NOT IN ('INR','EUR','USD') OR coalesce(fee->>'timing','') NOT IN ('before','after') OR coalesce(fee->>'recipient','') NOT IN ('ferex','direct_third_party') THEN RAISE EXCEPTION 'Invalid fee configuration'; END IF;
      IF coalesce((fee->>'tax_rate_percent')::numeric,0) NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid tax rate'; END IF;
      FOR amount_text IN SELECT value FROM jsonb_each_text(coalesce(fee->'countryAmounts','{}')) LOOP
        IF amount_text::numeric < 0 OR amount_text::numeric = 'NaN'::numeric THEN RAISE EXCEPTION 'Country-specific fees must be non-negative'; END IF;
      END LOOP;
      IF lower(fee->>'title') ~ '(university|tuition)' AND fee->>'recipient' <> 'direct_third_party' THEN RAISE EXCEPTION 'University fees must remain direct payments'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER education_fee_config_guard BEFORE INSERT OR UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.guard_education_fee_config();

COMMIT;
