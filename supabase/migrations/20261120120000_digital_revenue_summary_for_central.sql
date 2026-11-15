-- Central and the Digital dashboards read money from the real ledger (collections minus refunds), never from the legacy digital_invoices table.
create or replace function public.digital_received_summary(p_from date default null, p_to date default null)
returns table(currency text, received numeric, refunded numeric)
language sql stable security definer set search_path = public as $$
  select c.body->>'currency' as currency,
         coalesce(sum(t.amount), 0) as received,
         coalesce(sum((select coalesce(sum(r.amount), 0) from public.digital_refunds r where r.collection_id = t.id)), 0) as refunded
  from public.digital_collections t
  join public.digital_contracts c on c.id = t.contract_id
  where public.digital_is_admin()
    and (p_from is null or t.payment_date >= p_from) and (p_to is null or t.payment_date <= p_to)
  group by c.body->>'currency'
$$;
revoke all on function public.digital_received_summary(date, date) from public, anon;
grant execute on function public.digital_received_summary(date, date) to authenticated;

create or replace function public.digital_recent_payments(p_limit integer default 5)
returns table(id uuid, client_name text, project_title text, amount numeric, currency text, payment_date date, number text)
language sql stable security definer set search_path = public as $$
  select t.id, c.body->>'client_name', c.body->>'project_title', t.amount, c.body->>'currency', t.payment_date,
         (select d.number from public.digital_financial_documents d where d.kind = 'Receipt' and d.body->>'collection_id' = t.id::text limit 1)
  from public.digital_collections t join public.digital_contracts c on c.id = t.contract_id
  where public.digital_is_admin()
  order by t.created_at desc limit greatest(1, least(coalesce(p_limit, 5), 50))
$$;
revoke all on function public.digital_recent_payments(integer) from public, anon;
grant execute on function public.digital_recent_payments(integer) to authenticated;
