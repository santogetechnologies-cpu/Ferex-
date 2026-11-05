-- Razorpay Student UPI Payments integration
-- Allows verified Razorpay payments to be settled and documents issued automatically.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_razorpay_student_payment(
  p_student_id uuid,
  p_student_name text,
  p_fee_id text,
  p_amount numeric,
  p_razorpay_payment_id text,
  p_application_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee jsonb;
  v_cfg jsonb;
  v_payment_id uuid;
  v_ref_no text;
  v_title text;
  v_result jsonb;
BEGIN
  -- Authenticate student or admin
  IF auth.uid() <> p_student_id AND NOT public.education_finance_admin() THEN
    RAISE EXCEPTION 'Not authorized to record payment for this student';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF coalesce(btrim(p_razorpay_payment_id), '') = '' THEN
    RAISE EXCEPTION 'Valid Razorpay payment ID is required';
  END IF;

  -- Load fee configuration
  SELECT value INTO v_cfg FROM public.system_config WHERE key = 'fee_config';
  SELECT f INTO v_fee FROM jsonb_array_elements(public.education_configured_fees(v_cfg)) f
    WHERE f->>'id' = p_fee_id;

  IF v_fee IS NULL THEN
    v_title := initcap(replace(p_fee_id, '-', ' ')) || ' Fee';
  ELSE
    v_title := v_fee->>'title';
  END IF;

  -- Generate unique payment ID and ref
  v_payment_id := gen_random_uuid();
  v_ref_no := 'EDU-RZP-' || p_razorpay_payment_id;

  -- Check for existing payment by Razorpay payment ID
  IF EXISTS (SELECT 1 FROM public.payments WHERE utr_number = p_razorpay_payment_id AND status IN ('Paid', 'Verified')) THEN
    SELECT jsonb_build_object('id', id, 'ref_no', ref_no, 'status', status) INTO v_result
      FROM public.payments WHERE utr_number = p_razorpay_payment_id LIMIT 1;
    RETURN v_result;
  END IF;

  -- Insert confirmed payment record
  INSERT INTO public.payments (
    id,
    student_id,
    student_name,
    billing_application_id,
    title,
    description,
    amount,
    currency,
    payment_type,
    payment_method,
    utr_number,
    ref_no,
    status,
    paid_at,
    created_at
  ) VALUES (
    v_payment_id,
    p_student_id,
    coalesce(nullif(btrim(p_student_name), ''), 'Student'),
    p_application_id,
    v_title,
    v_title || ' paid via Razorpay UPI (' || p_razorpay_payment_id || ')',
    p_amount,
    'INR',
    'education:' || p_fee_id,
    'UPI',
    p_razorpay_payment_id,
    v_ref_no,
    'Paid',
    now(),
    now()
  );

  SELECT jsonb_build_object(
    'id', v_payment_id,
    'ref_no', v_ref_no,
    'status', 'Paid',
    'amount', p_amount,
    'payment_method', 'UPI',
    'utr_number', p_razorpay_payment_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_razorpay_student_payment TO authenticated;

COMMIT;

