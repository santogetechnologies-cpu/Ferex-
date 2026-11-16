-- Staff and counselors see and manage only meetings they host, attend, advise on, or hold for a student assigned to them.
-- Admins keep full access; students keep access to their own meetings.
create or replace function public.meeting_visible_to_staff(p_advisor uuid, p_host uuid, p_participant uuid, p_student uuid, p_advisor_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    auth.uid() in (p_advisor, p_host, p_participant)
    or (p_student is not null and public.is_student_counselor(p_student))
    or (nullif(btrim(coalesce(p_advisor_name, '')), '') is not null and exists (
         select 1 from public.users u where u.id = auth.uid() and lower(btrim(u.full_name)) = lower(btrim(p_advisor_name))))
  )
$$;
revoke all on function public.meeting_visible_to_staff(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.meeting_visible_to_staff(uuid, uuid, uuid, uuid, text) to authenticated;

drop policy if exists meetings_all on public.meetings;
create policy meetings_admin on public.meetings for all to authenticated
  using (public.get_auth_user_role() = any (array['superadmin','super_admin','central','admin','education_admin']))
  with check (public.get_auth_user_role() = any (array['superadmin','super_admin','central','admin','education_admin']));
create policy meetings_staff on public.meetings for all to authenticated
  using (public.get_auth_user_role() = any (array['staff','counselor']) and public.meeting_visible_to_staff(advisor_id, host_id, participant_id, student_id, advisor_name))
  with check (public.get_auth_user_role() = any (array['staff','counselor']) and public.meeting_visible_to_staff(advisor_id, host_id, participant_id, student_id, advisor_name));
create policy meetings_own on public.meetings for all to authenticated
  using (student_id = auth.uid() or host_id = auth.uid() or participant_id = auth.uid())
  with check (student_id = auth.uid() or host_id = auth.uid() or participant_id = auth.uid());
