-- Who may DECIDE attendance and leave (verify, mark, reopen, approve/reject, incentives):
--   Admin       -> staff of their own platform only, never themselves.
--   Super admin -> admins (any platform); staff only where a platform has no active admin; their own record.
-- Viewing (reports, payroll) keeps using attendance_can_manage, which is unchanged.
create or replace function public.attendance_can_decide(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case public.attendance_me_level()
    when 'superadmin' then
      p_user = auth.uid()
      or exists (select 1 from public.users u where u.id = p_user and public.attendance_level_of(u.role) = 'admin')
      or exists (select 1 from public.users u where u.id = p_user and public.attendance_level_of(u.role) = 'staff'
           and not exists (select 1 from public.users a where public.attendance_level_of(a.role) = 'admin'
                 and public.attendance_division_of(a.role, a.department) = public.attendance_division_of(u.role, u.department)
                 and coalesce(a.status, 'active') not in ('inactive', 'deleted', 'suspended') and coalesce(a.is_active, true)))
    when 'admin' then p_user is distinct from auth.uid() and exists (
      select 1 from public.users u where u.id = p_user and public.attendance_level_of(u.role) = 'staff'
        and public.attendance_division_of(u.role, u.department) = public.attendance_me_division())
    else false end
$$;
grant execute on function public.attendance_can_decide(uuid) to authenticated;

do $$
declare f text; def text;
begin
  foreach f in array array['attendance_leave_decide', 'attendance_reopen', 'attendance_incentive_decide', 'attendance_verify'] loop
    select pg_get_functiondef(p.oid) into def from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f;
    def := replace(def, 'public.attendance_can_manage(', 'public.attendance_can_decide(');
    execute def;
  end loop;
  select pg_get_functiondef(p.oid) into def from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'attendance_mark';
  def := replace(def, 'IF NOT (public.attendance_can_manage(p_user) OR (selfmark AND public.attendance_level_of(me.role) = ''admin'')) THEN', 'IF NOT public.attendance_can_decide(p_user) THEN');
  execute def;
end $$;

-- The team list tells the screens who the caller may decide for, so buttons are not shown for people they cannot act on.
drop function if exists public.attendance_team();
create function public.attendance_team()
returns table(user_id uuid, name text, email text, role text, division text, level text, is_me boolean, can_decide boolean)
language sql stable security definer set search_path to 'public' as $$
  select u.id, coalesce(nullif(u.full_name, ''), u.email), u.email, u.role, public.attendance_division_of(u.role, u.department),
         public.attendance_level_of(u.role), u.id = auth.uid(), public.attendance_can_decide(u.id)
  from public.users u
  where public.attendance_level_of(u.role) in ('staff', 'admin')
    and coalesce(u.status, 'active') not in ('inactive', 'deleted', 'suspended') and coalesce(u.is_active, true)
    and (u.id = auth.uid() or public.attendance_can_manage(u.id))
  order by 5, 6 desc, 2
$$;
grant execute on function public.attendance_team() to authenticated;
