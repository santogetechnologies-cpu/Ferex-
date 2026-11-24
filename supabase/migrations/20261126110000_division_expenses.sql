-- Expenses for the Education, Rimi and Trade admin panels (Digital keeps its own digital_expenses).
create table if not exists public.division_expenses (
  id uuid primary key default gen_random_uuid(),
  division text not null check (division in ('education', 'rimi', 'trade')),
  expense_date date not null default current_date,
  category text not null,
  vendor text not null default '',
  description text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'INR',
  payment_method text not null default 'Bank Transfer',
  reference_no text not null default '',
  status text not null default 'Paid' check (status in ('Paid', 'Pending', 'Cancelled')),
  created_by uuid default auth.uid(),
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists division_expenses_division_date on public.division_expenses(division, expense_date desc);

create or replace function public.division_expense_access(p_division text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(public.get_auth_user_role(), '') in ('superadmin', 'super_admin', 'central')
      or case p_division
           when 'education' then coalesce(public.get_auth_user_role(), '') in ('admin', 'education_admin', 'education')
           when 'rimi' then coalesce(public.get_auth_user_role(), '') in ('rimi_admin', 'rimi', 'rimi_frozen')
           when 'trade' then coalesce(public.get_auth_user_role(), '') in ('trade_admin', 'trade', 'global_trade')
           else false end
$$;
grant execute on function public.division_expense_access(text) to authenticated;

alter table public.division_expenses enable row level security;
drop policy if exists division_expenses_admin on public.division_expenses;
create policy division_expenses_admin on public.division_expenses for all to authenticated
  using (public.division_expense_access(division)) with check (public.division_expense_access(division));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='division_expenses') then
    alter publication supabase_realtime add table public.division_expenses;
  end if;
end $$;
