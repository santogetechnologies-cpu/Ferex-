-- Gateway/email configuration hold secrets (stripe_secret_key, webhook_secret): admins only.
DROP POLICY IF EXISTS "Allow read payment_gateways for authenticated users" ON public.payment_gateways;
CREATE POLICY "payment_gateways_admin_read" ON public.payment_gateways FOR SELECT TO authenticated USING (
  public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin') OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow read email_configurations for authenticated users" ON public.email_configurations;
CREATE POLICY "email_configurations_admin_read" ON public.email_configurations FOR SELECT TO authenticated USING (
  public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin') OR auth.role() = 'service_role');

-- Email logs contain message bodies: staff see them; a student sees only mail addressed to them.
DROP POLICY IF EXISTS "Allow read email_logs for authenticated users" ON public.email_logs;
CREATE POLICY "email_logs_read_scoped" ON public.email_logs FOR SELECT TO authenticated USING (
  public.is_internal_staff()
  OR lower(recipient_email) = lower((SELECT email FROM public.users WHERE id = auth.uid())));
