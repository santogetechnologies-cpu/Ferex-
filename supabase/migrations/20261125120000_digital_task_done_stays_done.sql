-- A task that is Done stays Done: it cannot be moved back by anyone except a Digital administrator working directly in the database tools.
create or replace function public.digital_task_done_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'Done' and new.status is distinct from 'Done' and not coalesce(public.digital_is_admin(), false) then
    raise exception 'A completed task cannot be reopened';
  end if;
  return new;
end $$;
drop trigger if exists digital_task_done_guard on public.digital_tasks;
create trigger digital_task_done_guard before update on public.digital_tasks for each row execute function public.digital_task_done_guard();
