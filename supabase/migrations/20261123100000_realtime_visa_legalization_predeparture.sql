-- Staff edits to the VFS stage, legalization status and pre-departure packet must reach the student's open
-- portal without a reload. These tables were not in the realtime publication, so no change was ever pushed.
do $$
declare t text;
begin
  foreach t in array array['visa_applications','legalization_records','pre_departure_checklists','payments'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
