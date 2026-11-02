BEGIN;

-- 1. Update ferex_users_read_guard to allow Digital Admin and Central Admins to query staff members
DROP POLICY IF EXISTS ferex_users_read_guard ON public.users;
CREATE POLICY ferex_users_read_guard ON public.users AS RESTRICTIVE FOR SELECT
USING (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
  OR (auth.uid() IS NULL AND coalesce(status, 'active') NOT IN ('inactive', 'deleted', 'suspended'))
  OR (auth.uid() IS NOT NULL AND NOT public.digital_in_scope())
);

-- 2. Update ferex_users_write_guard to allow Digital Admin to manage digital users
DROP POLICY IF EXISTS ferex_users_write_guard ON public.users;
CREATE POLICY ferex_users_write_guard ON public.users AS RESTRICTIVE FOR UPDATE
USING (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
);

-- 3. Update ferex_users_insert_guard to allow Digital Admin to provision staff
DROP POLICY IF EXISTS ferex_users_insert_guard ON public.users;
CREATE POLICY ferex_users_insert_guard ON public.users AS RESTRICTIVE FOR INSERT
WITH CHECK (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
  OR auth.role() = 'service_role'
);

-- 4. Mark legacy mock / template and sweep test accounts as deleted
UPDATE public.users
SET status = 'deleted'
WHERE lower(email) IN (
  'pm@ferex.com',
  'digital@ferex.com',
  'digimanager@ferex.com',
  'creative@ferex.com',
  'accounts@ferex.com',
  'superadmin@rolesweep.test',
  'digital_admin@rolesweep.test',
  'admin@rolesweep.test'
);

COMMIT;
