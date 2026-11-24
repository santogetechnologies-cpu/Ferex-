-- Newer helper functions are for signed-in users only (never anonymous callers), and trigger functions are not callable at all.
revoke execute on function public.attendance_can_decide(uuid) from anon, public;
revoke execute on function public.attendance_team() from anon, public;
revoke execute on function public.division_expense_access(text) from anon, public;
revoke execute on function public.rimi_update_sales_order_items(uuid, jsonb) from anon, public;
revoke execute on function public.attendance_payroll_to_expense() from anon, authenticated, public;
alter function public.digital_task_stamp_assigned() set search_path = public;
alter function public.digital_task_done_guard() set search_path = public;
