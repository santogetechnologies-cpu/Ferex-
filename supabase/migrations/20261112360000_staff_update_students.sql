-- Counselors/staff manage student profiles (contact details, destination, counselor). Role and identity changes are
-- still blocked by the ferex_guard_user_role trigger, and only student rows are reachable.
DROP POLICY IF EXISTS "users_staff_update_students" ON public.users;
CREATE POLICY "users_staff_update_students" ON public.users FOR UPDATE TO authenticated
  USING (role = 'student' AND public.is_education_staff())
  WITH CHECK (role = 'student' AND public.is_education_staff());
