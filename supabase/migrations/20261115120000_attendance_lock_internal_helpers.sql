-- Internal helpers are only called from inside the attendance functions (which run with the owner's rights).
-- They were callable by any signed-in user, and attendance_calc would have revealed anyone's salary figures.
REVOKE ALL ON FUNCTION public.attendance_calc(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_leave_split(uuid, public.attendance_leave_types, numeric, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_leave_used(uuid, text, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_month_locked(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_status_for_hours(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_working_days_between(text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.digital_fill_assignee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.digital_milestone_billing_notice() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.digital_project_notification() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.attendance_level_of(text) SET search_path = public;
ALTER FUNCTION public.attendance_division_of(text, text) SET search_path = public;
ALTER FUNCTION public.digital_staff_eligible(text, text) SET search_path = public;
REVOKE ALL ON FUNCTION public.attendance_me_level() FROM anon;
REVOKE ALL ON FUNCTION public.attendance_me_division() FROM anon;
REVOKE ALL ON FUNCTION public.attendance_can_manage(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.attendance_rules_for(text) FROM anon;
REVOKE ALL ON FUNCTION public.attendance_today(text) FROM anon;
REVOKE ALL ON FUNCTION public.attendance_is_working_day(text, date) FROM anon;
