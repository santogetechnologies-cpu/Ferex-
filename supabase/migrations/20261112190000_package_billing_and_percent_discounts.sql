-- Country fee packages (per-student billing, registration toggle) and per-student % discounts.
ALTER TABLE public.education_student_fee_overrides
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);

CREATE OR REPLACE FUNCTION public.guard_education_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; fee jsonb; app public.applications; country_name text; expected numeric;
  pkg jsonb; pkg_id text; inst jsonb; fee_key text; ov record;
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
  fee_key := substring(NEW.payment_type from 11);
  -- A student on a country fee package is billed from that package instead of the standard fees.
  SELECT fee_package_id INTO pkg_id FROM public.education_student_preferences
    WHERE student_id = NEW.student_id AND fee_flow_mode = 'package';
  IF pkg_id IS NOT NULL THEN
    SELECT p INTO pkg FROM public.system_config sc, jsonb_array_elements(sc.value) p
      WHERE sc.key = 'ferex_country_fee_packages' AND jsonb_typeof(sc.value) = 'array' AND p->>'id' = pkg_id LIMIT 1;
  END IF;
  IF fee_key LIKE 'pkg:%' THEN
    IF pkg IS NULL THEN RAISE EXCEPTION 'No fee package is assigned to this student'; END IF;
    SELECT i INTO inst FROM jsonb_array_elements(coalesce(pkg->'installments', '[]'::jsonb)) i
      WHERE 'pkg:' || (pkg->>'id') || ':' || (i->>'id') = fee_key LIMIT 1;
    IF inst IS NULL THEN RAISE EXCEPTION 'This installment is not part of the assigned fee package'; END IF;
    fee := jsonb_build_object('id', fee_key, 'title', inst->>'title', 'enabled', true, 'amount', (inst->>'amount')::numeric,
      'currency', pkg->>'currency', 'recipient', 'ferex', 'stage', coalesce((inst->>'stage_trigger')::integer, 1), 'timing', coalesce(inst->>'timing', 'before'));
  ELSIF fee_key = 'registration' AND pkg IS NOT NULL THEN
    fee := jsonb_build_object('id', 'registration', 'title', 'Advanced Registration Fee',
      'enabled', coalesce((pkg->'registration_fee'->>'enabled')::boolean, false) AND coalesce((pkg->'registration_fee'->>'amount')::numeric, 0) > 0,
      'amount', coalesce((pkg->'registration_fee'->>'amount')::numeric, 0), 'currency', pkg->>'currency', 'recipient', 'ferex', 'stage', 3, 'timing', 'before');
  ELSE
    SELECT f INTO fee FROM jsonb_array_elements(public.education_configured_fees(cfg)) f WHERE f->>'id' = fee_key;
  END IF;
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
  -- Per-student discount: percentage of the base fee, or a fixed agreed amount.
  SELECT * INTO ov FROM public.education_student_fee_overrides WHERE student_id = NEW.student_id AND fee_id = fee->>'id';
  IF FOUND THEN
    IF coalesce(ov.discount_percent, 0) > 0 THEN
      expected := round(expected * (100 - least(100, ov.discount_percent))) / 100.0;
    ELSIF ov.custom_amount > 0 OR coalesce(ov.discount_amount, 0) > 0 THEN
      expected := ov.custom_amount;
    END IF;
  END IF;
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
