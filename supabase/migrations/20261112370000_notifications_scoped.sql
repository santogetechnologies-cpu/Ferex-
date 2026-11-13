-- Staff-wide alerts (no owner) were readable by every signed-in user, including students, and any signed-in user could
-- read everyone's notifications. Now: own notifications; staff also see the staff-wide ones; admins see all.
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND public.is_internal_staff())
  OR coalesce(public.get_auth_user_role(), '') IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education'));
-- Anyone signed in may raise a notification for themselves or for staff (e.g. a student uploading a document);
-- staff may notify any user.
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL OR public.is_internal_staff());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_internal_staff()))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND public.is_internal_staff()));
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_internal_staff()));
