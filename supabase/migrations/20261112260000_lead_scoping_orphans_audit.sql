-- 1. Counselors only see and change the enquiries assigned to them; admins see all.
CREATE OR REPLACE FUNCTION public.counselor_owns_lead(p_id uuid, p_email text, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT p_id = u.id
         OR (coalesce(btrim(p_email), '') <> '' AND lower(btrim(p_email)) = lower(u.email))
         OR (coalesce(btrim(p_name), '') <> '' AND lower(btrim(p_name)) = lower(btrim(u.full_name)))
       FROM public.users u WHERE u.id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.education_lead_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.role() = 'service_role'
      OR coalesce(public.get_auth_user_role(), '') IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education')
$$;

DROP POLICY IF EXISTS "Education staff and admin manage leads" ON public.education_leads;
DROP POLICY IF EXISTS "Education admins manage all leads" ON public.education_leads;
DROP POLICY IF EXISTS "Counselors manage their own leads" ON public.education_leads;
CREATE POLICY "Education admins manage all leads" ON public.education_leads FOR ALL TO authenticated
  USING (public.education_lead_admin()) WITH CHECK (public.education_lead_admin());
CREATE POLICY "Counselors manage their own leads" ON public.education_leads FOR ALL TO authenticated
  USING (coalesce(public.get_auth_user_role(), '') IN ('counselor', 'staff')
         AND public.counselor_owns_lead(assigned_counselor_id, assigned_counselor_email, assigned_counselor_name))
  WITH CHECK (coalesce(public.get_auth_user_role(), '') IN ('counselor', 'staff')
         AND public.counselor_owns_lead(assigned_counselor_id, assigned_counselor_email, assigned_counselor_name));

DROP POLICY IF EXISTS "Lead activities staff access" ON public.education_lead_activities;
DROP POLICY IF EXISTS "Education admins manage all lead activities" ON public.education_lead_activities;
DROP POLICY IF EXISTS "Counselors manage activities of their leads" ON public.education_lead_activities;
CREATE POLICY "Education admins manage all lead activities" ON public.education_lead_activities FOR ALL TO authenticated
  USING (public.education_lead_admin()) WITH CHECK (public.education_lead_admin());
CREATE POLICY "Counselors manage activities of their leads" ON public.education_lead_activities FOR ALL TO authenticated
  USING (coalesce(public.get_auth_user_role(), '') IN ('counselor', 'staff') AND EXISTS (
    SELECT 1 FROM public.education_leads l WHERE l.id = lead_id
      AND public.counselor_owns_lead(l.assigned_counselor_id, l.assigned_counselor_email, l.assigned_counselor_name)))
  WITH CHECK (coalesce(public.get_auth_user_role(), '') IN ('counselor', 'staff') AND EXISTS (
    SELECT 1 FROM public.education_leads l WHERE l.id = lead_id
      AND public.counselor_owns_lead(l.assigned_counselor_id, l.assigned_counselor_email, l.assigned_counselor_name)));

-- 2. Every user deletion is recorded (the old audit insert used columns that do not exist and was silently skipped).
CREATE OR REPLACE FUNCTION public.audit_user_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.central_audit_logs (id, actor_id, actor_name, actor_role, action, target_entity, target_id, payload)
  VALUES (gen_random_uuid(), auth.uid(), coalesce((SELECT full_name FROM public.users WHERE id = auth.uid()), 'system'),
          coalesce(public.get_auth_user_role(), 'system'), 'DELETE_USER', 'user', OLD.id::text,
          jsonb_build_object('email', OLD.email, 'role', OLD.role, 'full_name', OLD.full_name));
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS audit_user_deleted ON public.users;
CREATE TRIGGER audit_user_deleted AFTER DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_user_deleted();

-- 3. Logins that have no profile row are dead accounts (the app refuses them as "deleted") left by the old delete
-- path; they only block re-registering the same email. Record them, then remove them.
INSERT INTO public.central_audit_logs (id, actor_name, actor_role, action, target_entity, target_id, payload)
SELECT gen_random_uuid(), 'system', 'system', 'PURGE_ORPHAN_LOGIN', 'auth_user', a.id::text,
       jsonb_build_object('email', a.email, 'created_at', a.created_at, 'last_sign_in_at', a.last_sign_in_at,
                          'role', coalesce(a.raw_user_meta_data->>'role', a.raw_app_meta_data->>'role'))
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id OR lower(u.email) = lower(a.email))
  AND lower(a.email) NOT IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com');

DELETE FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id OR lower(u.email) = lower(a.email))
  AND lower(a.email) NOT IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com');
