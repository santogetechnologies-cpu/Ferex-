-- 1. Shared, database-backed lists for Digital (service categories, client categories, tags, deliverable types, lead categories).
--    Until now these were kept in each browser's localStorage because the table they pointed to never existed.
create table if not exists public.digital_settings (
  key text primary key check (key in ('masters')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.digital_settings enable row level security;
drop policy if exists digital_settings_read on public.digital_settings;
create policy digital_settings_read on public.digital_settings for select to authenticated using (public.digital_is_team());
revoke all on public.digital_settings from anon, authenticated;
grant select on public.digital_settings to authenticated;

create or replace function public.digital_set_master(p_type text, p_values jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cleaned jsonb; result jsonb;
begin
  if not public.digital_is_admin() then raise exception 'Digital admin required'; end if;
  if p_type not in ('service_categories','client_categories','tags','deliverable_types','lead_categories') then raise exception 'This list cannot be customised'; end if;
  if jsonb_typeof(p_values) <> 'array' then raise exception 'A list is required'; end if;
  select coalesce(jsonb_agg(v order by first_pos), '[]'::jsonb) into cleaned from (
    select trim(x) v, min(ord) first_pos from jsonb_array_elements_text(p_values) with ordinality a(x, ord)
    where trim(x) <> '' group by trim(x)) s;
  if jsonb_array_length(cleaned) = 0 then raise exception 'Keep at least one value in the list'; end if;
  if jsonb_array_length(cleaned) > 60 or exists (select 1 from jsonb_array_elements_text(cleaned) x where length(x) > 80) then raise exception 'Lists hold up to 60 values of 80 characters'; end if;
  insert into public.digital_settings(key, value, updated_by) values ('masters', jsonb_build_object(p_type, cleaned), auth.uid())
  on conflict (key) do update set value = public.digital_settings.value || jsonb_build_object(p_type, cleaned), updated_at = now(), updated_by = auth.uid()
  returning value into result;
  return result;
end $$;
revoke all on function public.digital_set_master(text, jsonb) from public, anon;
grant execute on function public.digital_set_master(text, jsonb) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'digital_settings') then
    alter publication supabase_realtime add table public.digital_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'digital_commerce_settings') then
    alter publication supabase_realtime add table public.digital_commerce_settings;
  end if;
end $$;

-- 2. Every proposal, invoice, receipt and credit note carries the agency details as they are when it is issued,
--    so filling in the agency profile later still reaches documents for contracts created before it was set.
create or replace function public.digital_agency_snapshot() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'agency_name', coalesce(nullif(config->>'agency_name',''), 'Ferex Digital'),
    'agency_address', coalesce(config->>'address',''),
    'agency_tax_number', coalesce(config->>'tax_number',''),
    'payment_instructions', coalesce(config->>'payment_instructions',''))
  from (select coalesce((select config from public.digital_commerce_settings where id), '{}'::jsonb) config) s
$$;
revoke all on function public.digital_agency_snapshot() from public, anon;
grant execute on function public.digital_agency_snapshot() to authenticated;

do $$ declare f text; n text; begin
  foreach n in array array['digital_issue_document','digital_collect_payment','digital_refund_payment'] loop
    select pg_get_functiondef(p.oid) into f from pg_proc p where p.proname = n and p.pronamespace = 'public'::regnamespace;
    if position('digital_agency_snapshot' in f) = 0 then
      f := replace(f, 'c.body||public.digital_document_values(', 'c.body||public.digital_agency_snapshot()||public.digital_document_values(');
      if position('digital_agency_snapshot' in f) = 0 then raise exception 'Could not patch %', n; end if;
      execute f;
    end if;
  end loop;
end $$;
