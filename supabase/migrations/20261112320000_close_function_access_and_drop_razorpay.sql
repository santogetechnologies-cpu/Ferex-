-- Razorpay was removed from the app; its payment-recording function was still callable by any signed-in user.
DROP FUNCTION IF EXISTS public.record_razorpay_student_payment(uuid, text, text, numeric, text, uuid);
-- Old unused trigger function (no trigger references it).
DROP FUNCTION IF EXISTS public.education_payment_guard();
ALTER FUNCTION public.sync_chat_message_columns() SET search_path = public;
ALTER FUNCTION public.sync_student_document_columns() SET search_path = public;

-- Anonymous visitors must not execute server functions (RPC); signed-in users and the service role keep access.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, PUBLIC;
