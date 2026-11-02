BEGIN;

-- 1. Ensure status column exists on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Extend users_role_check to include account_manager and variations
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'superadmin', 'super_admin', 'central',
    'admin', 'education_admin', 'education', 'staff', 'counselor',
    'digital', 'digital_admin', 'ferex_digital', 'digital_director',
    'project_manager', 'digital_manager', 'pm', 'digimanager',
    'account_manager', 'accountmanager', 'digital_account_manager', 'account_executive', 'client_manager',
    'digital_staff', 'designer', 'developer', 'lead_developer', 'creative',
    'trade', 'trade_admin', 'global_trade', 'logistics_officer',
    'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'warehouse_manager',
    'student', 'trade_client', 'rimi_client', 'digital_client'
  )
);

-- 3. Grant permissions on helper functions so authenticated and anon users can safely query without 42501
GRANT EXECUTE ON FUNCTION public.ferex_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.digital_is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.digital_is_team() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.digital_in_scope() TO anon, authenticated, service_role;

-- 4. Update digital_is_team to recognize account managers
CREATE OR REPLACE FUNCTION public.digital_is_team() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT coalesce(
   public.digital_is_admin() OR
   public.ferex_role() IN (
     'digital_manager','project_manager','pm','digimanager','digital_staff','designer','developer','creative','lead_developer',
     'account_manager','accountmanager','digital_account_manager','account_executive','client_manager'
   ),
   false
 )
$$;

-- 5. Update digital_staff_directory to include account managers and exclude inactive/deleted accounts
CREATE OR REPLACE FUNCTION public.digital_staff_directory()
RETURNS TABLE(id uuid, name text, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT u.id, coalesce(nullif(u.full_name,''), split_part(u.email,'@',1)), u.email, u.role
 FROM public.users u
 WHERE coalesce(u.status, 'active') NOT IN ('inactive', 'deleted', 'suspended')
   AND (
     u.role IN (
       'digital_admin','digital','ferex_digital','digital_director',
       'project_manager','digital_manager','pm','digimanager',
       'account_manager','accountmanager','digital_account_manager','account_executive','client_manager',
       'digital_staff','designer','developer','lead_developer','creative',
       'central','superadmin','super_admin','admin'
     )
     OR lower(coalesce(u.department,'')) LIKE '%digital%'
   )
 ORDER BY u.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.digital_staff_directory() TO anon, authenticated, service_role;

-- 6. Update triggers to accept account managers
CREATE OR REPLACE FUNCTION public.digital_guard_task_origin() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.digital_is_admin() AND pg_trigger_depth()=1 THEN
  IF TG_OP='INSERT' THEN
   IF NEW.central_task_id IS NOT NULL THEN RAISE EXCEPTION 'Only central administrators can create a Central directive'; END IF;
   NEW.created_by:=auth.uid()::text;
  END IF;
 END IF;
 IF NEW.assigned_staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.digital_staff_directory() s WHERE s.id=NEW.assigned_staff_id) AND pg_trigger_depth()=1 THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=NEW.assigned_staff_id AND coalesce(u.status,'active') NOT IN ('inactive','deleted')) THEN
     RAISE EXCEPTION 'Choose a registered Digital assignee';
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.digital_validate_central_assignee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF lower(coalesce(NEW.category,''))='digital' AND
 (TG_OP='INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.category IS DISTINCT FROM OLD.category) THEN
  IF NEW.assigned_staff_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id=NEW.assigned_staff_id
      AND coalesce(u.status,'active') NOT IN ('inactive','deleted')
      AND u.role IN (
        'digital_admin','digital','ferex_digital','digital_director',
        'project_manager','digital_manager','pm','digimanager',
        'account_manager','accountmanager','digital_account_manager','account_executive','client_manager',
        'digital_staff','designer','developer','lead_developer','creative',
        'central','superadmin','super_admin','admin'
      )
  ) THEN
    RAISE EXCEPTION 'Choose a Digital assignee with a registered login account';
  END IF;
  IF NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.digital_projects WHERE id=NEW.project_id AND NOT coalesce(is_deleted,false)) THEN
    RAISE EXCEPTION 'Choose an active Digital project';
  END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
