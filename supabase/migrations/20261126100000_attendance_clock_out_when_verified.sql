-- Clocking out must always work for someone who is clocked in. When an administrator has already verified the day, the
-- verified status and hours they set stand; the clock-out time is still recorded so the person is no longer "clocked in".
create or replace function public.attendance_clock_out(p_summary text default '')
returns attendance_days language plpgsql security definer set search_path to 'public' as $function$
declare d public.attendance_days; mins numeric;
begin
  select * into d from public.attendance_days where user_id = auth.uid() and clock_in is not null and clock_out is null order by work_date desc limit 1 for update;
  if not found then raise exception 'You are not clocked in'; end if;
  if d.review = 'Verified' then
    update public.attendance_days set clock_out = now(), work_summary = coalesce(nullif(trim(p_summary), ''), work_summary),
      note = trim(coalesce(note, '') || ' Clock-out recorded after verification.'), updated_at = now() where id = d.id returning * into d;
    return d;
  end if;
  mins := d.banked_minutes + extract(epoch from (now() - d.clock_in)) / 60;
  update public.attendance_days set clock_out = now(), hours = round(mins / 60.0, 2), status = public.attendance_status_for_hours(d.division, round(mins / 60.0, 2)),
    work_summary = coalesce(nullif(trim(p_summary), ''), work_summary), updated_at = now() where id = d.id returning * into d;
  return d;
end $function$;
