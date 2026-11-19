-- The Digital staff directory listed Central super admins and the Education "admin" role as Digital team members.
create or replace function public.digital_staff_directory()
returns table(id uuid, name text, email text, role text)
language sql stable security definer set search_path to 'public' as $$
  select u.id, coalesce(nullif(u.full_name,''), split_part(u.email,'@',1)), u.email, u.role
  from public.users u
  where coalesce(u.status, 'active') not in ('inactive', 'deleted', 'suspended')
    and coalesce(u.is_active, true)
    and (u.role in ('digital_admin','digital','ferex_digital','digital_director','project_manager','digital_manager','pm','digimanager',
                    'account_manager','accountmanager','digital_account_manager','account_executive','client_manager',
                    'digital_staff','designer','developer','lead_developer','creative')
         or (lower(coalesce(u.department,'')) like '%digital%' and u.role <> 'student' and u.role not like '%\_client' escape '\'))
  order by u.full_name asc;
$$;
