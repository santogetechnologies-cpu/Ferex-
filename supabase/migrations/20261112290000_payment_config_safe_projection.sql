-- Students need the UPI payee and which methods are enabled, never gateway secrets. Admins keep reading the full record.
CREATE OR REPLACE FUNCTION public.get_public_payment_config() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'upi', coalesce(value->'upi', '{}'::jsonb),
    'divisions', coalesce(value->'divisions', '{}'::jsonb))
  FROM public.system_config WHERE key = 'payment_gateways'
$$;
REVOKE ALL ON FUNCTION public.get_public_payment_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO authenticated;

DROP POLICY IF EXISTS "system_config_read" ON public.system_config;
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT TO authenticated USING (
  (key NOT IN ('email_config', 'payment_gateways') AND (key NOT LIKE 'agreement\_%' OR key = 'agreement_' || auth.uid()::text OR public.is_education_staff()))
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin')
  OR auth.role() = 'service_role');
