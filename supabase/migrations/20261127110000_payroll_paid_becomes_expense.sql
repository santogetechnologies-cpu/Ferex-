-- Paid payroll is money out of the platform's books: it appears under that platform's Expenses, and disappears again if the payroll is reopened.
create unique index if not exists division_expenses_payroll_ref on public.division_expenses(reference_no) where reference_no like 'payroll:%';

create or replace function public.attendance_payroll_to_expense()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_ref text := 'payroll:' || new.id::text; v_title text;
begin
  if new.status = 'Paid' and old.status is distinct from 'Paid' then
    if new.division in ('education', 'rimi', 'trade') then
      insert into public.division_expenses(division, expense_date, category, vendor, description, amount, currency, payment_method, reference_no, status, created_by_name)
      values (new.division, coalesce(new.paid_at::date, current_date),
              case new.division when 'rimi' then 'Driver & Warehouse Wages' when 'education' then 'Salaries & Commissions' else 'Salaries & Wages' end,
              coalesce(new.user_name, ''), 'Payroll ' || new.month || coalesce(' · ' || nullif(new.paid_reference, ''), ''),
              greatest(new.net, 0.01), coalesce(new.currency, 'INR'), 'Bank Transfer', v_ref, 'Paid', 'Payroll')
      on conflict do nothing;
    elsif new.division = 'digital' then
      v_title := 'Payroll ' || new.month || ' · ' || coalesce(new.user_name, '') || ' [' || left(new.id::text, 8) || ']';
      if not exists (select 1 from public.digital_expenses where title = v_title) then
        insert into public.digital_expenses(title, category, amount, vendor, date, status, currency)
        values (v_title, 'Salaries', greatest(new.net, 0), coalesce(new.user_name, ''), coalesce(new.paid_at::date, current_date), 'Paid', coalesce(new.currency, 'INR'));
      end if;
    end if;
  elsif old.status = 'Paid' and new.status is distinct from 'Paid' then
    delete from public.division_expenses where reference_no = v_ref;
    delete from public.digital_expenses where title like '% [' || left(new.id::text, 8) || ']' and title like 'Payroll %';
  end if;
  return new;
end $$;
drop trigger if exists attendance_payroll_to_expense on public.attendance_payroll;
create trigger attendance_payroll_to_expense after update of status on public.attendance_payroll for each row execute function public.attendance_payroll_to_expense();
