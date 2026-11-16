-- 1. One definition of "how far along is this student", used by the payment guard and by the student's screen.
create or replace function public.education_student_reached_stage(p_student uuid, p_app uuid default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare app public.applications; reached integer := 1; agreement jsonb;
begin
  if p_student is distinct from auth.uid() and not public.education_finance_admin() and auth.role() <> 'service_role'
     and coalesce(public.get_auth_user_role(), '') not in ('staff', 'counselor', 'admin', 'education_admin', 'superadmin', 'super_admin', 'central') then
    raise exception 'Not allowed';
  end if;
  if p_app is not null then
    select * into app from public.applications where id = p_app and student_id = p_student;
  else
    select * into app from public.applications where student_id = p_student and university_id is not null
      and status not in ('Rejected', 'Withdrawn', 'Closed') order by created_at desc limit 1;
  end if;
  select greatest(1, coalesce(max(stage_number), 1)) into reached from public.education_workflow_progress where student_id = p_student and status = 'Completed';
  select body into agreement from public.education_service_agreements where student_id = p_student;
  if agreement->>'status' = 'Signed' then reached := greatest(reached, 2); end if;
  if app.id is not null and app.status <> 'Draft' then reached := greatest(reached, 6); end if;
  if nullif(app.offer_letter_url, '') is not null or app.status in ('Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Enrolled') then reached := greatest(reached, 7); end if;
  if nullif(app.final_acceptance_url, '') is not null then reached := greatest(reached, 8); end if;
  if app.status in ('Visa Processing', 'Visa Approved', 'Enrolled') then reached := greatest(reached, 9); end if;
  if app.status in ('Visa Approved', 'Enrolled') then reached := greatest(reached, 10); end if;
  if app.status = 'Enrolled' then reached := 12; end if;
  return reached;
end $$;
revoke all on function public.education_student_reached_stage(uuid, uuid) from public, anon;
grant execute on function public.education_student_reached_stage(uuid, uuid) to authenticated, service_role;

-- 2. The payment guard.
do $$ declare f text; a text; b text; begin
  select pg_get_functiondef(p.oid) into f from pg_proc p where p.proname = 'guard_education_payment' and p.pronamespace = 'public'::regnamespace;

  -- A student cannot pay anything until education admin has set their plan.
  a := E'  IF flow = ''pending'' AND fee_key <> ''registration'' THEN';
  if position(a in f) = 0 then raise exception 'guard text changed (pending)'; end if;
  f := replace(f, a, E'  IF flow = ''pending'' AND NOT public.education_finance_admin() THEN\n    RAISE EXCEPTION ''Your payment plan has not been set yet. You can pay as soon as your counselor sets it.'';\n  END IF;\n' || a);

  -- A package can leave the registration fee out.
  a := E'ELSIF fee_key = ''registration'' AND pkg IS NOT NULL AND coalesce((pkg->''registration_fee''->>''enabled'')::boolean, false)';
  if position(a in f) = 0 then raise exception 'guard text changed (registration)'; end if;
  f := replace(f, a, E'ELSIF fee_key = ''registration'' AND pkg IS NOT NULL AND coalesce((pkg->''registration_fee''->>''included'')::boolean, true) = false THEN\n    RAISE EXCEPTION ''The registration fee is not part of this student''''s package.'';\n  ' || a);

  -- Stage: shared function; the registration fee is due as soon as the plan is set.
  a := E'SELECT greatest(1, coalesce(max(stage_number), 1)) INTO reached FROM public.education_workflow_progress';
  b := E'IF app.status = ''Enrolled'' THEN reached := 12; END IF;';
  if position(a in f) = 0 or position(b in f) = 0 then raise exception 'guard text changed (stage)'; end if;
  f := substring(f from 1 for position(a in f) - 1) || E'reached := public.education_student_reached_stage(NEW.student_id, app.id);' || substring(f from position(b in f) + length(b));
  a := E'IF reached < required_stage THEN';
  if position(a in f) = 0 then raise exception 'guard text changed (required)'; end if;
  f := replace(f, a, E'IF fee_key <> ''registration'' AND reached < required_stage THEN');
  execute f;
end $$;
