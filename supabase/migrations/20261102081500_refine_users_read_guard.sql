BEGIN;

-- Refine ferex_users_read_guard so Digital Admin and Central Admins can manage users, while managers read only themselves
DROP POLICY IF EXISTS ferex_users_read_guard ON public.users;
CREATE POLICY ferex_users_read_guard ON public.users AS RESTRICTIVE FOR SELECT
USING (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
  OR (auth.uid() IS NULL AND coalesce(status, 'active') NOT IN ('inactive', 'deleted', 'suspended'))
  OR (auth.uid() IS NOT NULL AND NOT public.digital_in_scope())
);

COMMIT;
