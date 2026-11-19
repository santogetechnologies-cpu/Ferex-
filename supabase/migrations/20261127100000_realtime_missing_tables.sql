-- Pages subscribe to these tables but they were never published, so changes only showed after a reload.
do $$
declare t text;
begin
  foreach t in array array['digital_notifications','digital_sprints','education_student_fee_overrides','education_student_preferences','education_workflow_progress','email_logs','invoices','meetings','notifications','receipts','digital_expenses','digital_assets'] loop
    if to_regclass('public.' || t) is not null and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
