-- Signed-out visitors cannot run the role helper functions, so any policy that calls them must not apply to them.
-- Otherwise a signed-out lookup of public.users fails with "permission denied for function get_auth_user_role".
alter policy users_read_own on public.users to authenticated;
alter policy users_super_admin_all on public.users to authenticated;
alter policy ferex_users_insert_guard on public.users to authenticated;
alter policy users_insert_own on public.users to authenticated;
alter policy users_self_update on public.users to authenticated;
