-- Tells Digital administrators, in their notification list, about payment terms that are overdue or due within 3 days.
-- Runs every morning; the same term is flagged at most once every 3 days per administrator.
create or replace function public.digital_flag_due_terms() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record; a record; days integer; ttl text; msg text; lnk text;
begin
  for r in
    select c.project_id, c.body->>'project_title' project_title, c.body->>'currency' currency, x->>'label' label,
           (x->>'due_date')::date due, coalesce((x->>'amount')::numeric,0) - coalesce((x->>'received')::numeric,0) remaining
    from public.digital_contracts c, jsonb_array_elements(c.body->'parts') x
    where coalesce((x->>'amount')::numeric,0) - coalesce((x->>'received')::numeric,0) > 0
      and (x->>'due_date')::date <= current_date + 3
      and exists (select 1 from public.digital_projects p where p.id = c.project_id and not coalesce(p.is_deleted,false))
  loop
    days := current_date - r.due;
    ttl := case when days > 0 then 'Payment overdue' else 'Payment due soon' end;
    msg := coalesce(r.project_title,'') || ' · ' || r.label || ' · ' || r.currency || ' ' || to_char(r.remaining, 'FM999999999990.00') || ' outstanding, ' ||
           case when days > 0 then days || ' day' || case when days = 1 then '' else 's' end || ' overdue' when days = 0 then 'due today' else 'due in ' || (-days) || ' day' || case when days = -1 then '' else 's' end end;
    lnk := '/digital/billing?project=' || r.project_id;
    for a in select id from public.users where role in ('digital','digital_admin','ferex_digital') and coalesce(status,'active') <> 'inactive' loop
      if not exists (select 1 from public.digital_notifications nt where nt.recipient_id = a.id and nt.link = lnk and nt.title = ttl and position(r.label in nt.message) > 0 and nt.created_at > now() - interval '3 days') then
        insert into public.digital_notifications(title, message, type, category, link, recipient_id) values (ttl, msg, 'Billing', 'Billing', lnk, a.id);
        n := n + 1;
      end if;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.digital_flag_due_terms() from public, anon, authenticated;

do $$ begin
  begin
    create extension if not exists pg_cron;
    perform cron.unschedule('digital-due-terms') where exists (select 1 from cron.job where jobname = 'digital-due-terms');
    perform cron.schedule('digital-due-terms', '30 3 * * *', 'select public.digital_flag_due_terms()');
  exception when others then
    raise notice 'pg_cron not available: %', sqlerrm;
  end;
end $$;
