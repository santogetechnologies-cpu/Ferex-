-- Project managers cannot read contracts (they hold amounts), but linking a delivery milestone to a payment term
-- needs the term names and due dates. This returns only those, for projects the caller can access, with no amounts.
create or replace function public.digital_project_terms(p_project uuid)
returns table(id text, label text, due_date text, status text)
language sql stable security definer set search_path = public as $$
  select x->>'id', x->>'label', x->>'due_date',
         case when coalesce((x->>'received')::numeric,0) >= coalesce((x->>'amount')::numeric,0) and coalesce((x->>'amount')::numeric,0) > 0 then 'Paid'
              when coalesce((x->>'received')::numeric,0) > 0 then 'Partially Paid'
              else 'Unpaid' end
  from public.digital_contracts c, jsonb_array_elements(c.body->'parts') x
  where c.project_id = p_project and public.digital_is_team() and public.digital_project_access(p_project)
$$;
revoke all on function public.digital_project_terms(uuid) from public, anon;
grant execute on function public.digital_project_terms(uuid) to authenticated;
