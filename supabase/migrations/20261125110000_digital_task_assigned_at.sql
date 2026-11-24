-- Every task records the date it was assigned (and re-stamps it when the task is reassigned), next to the target date.
alter table public.digital_tasks add column if not exists assigned_at timestamptz;
update public.digital_tasks set assigned_at = created_at where assigned_at is null;
create or replace function public.digital_task_stamp_assigned()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.assigned_at := coalesce(new.assigned_at, now());
  elsif new.assigned_staff_id is distinct from old.assigned_staff_id or new.assigned_to is distinct from old.assigned_to then
    new.assigned_at := now();
  else
    new.assigned_at := coalesce(new.assigned_at, old.assigned_at, new.created_at);
  end if;
  return new;
end $$;
drop trigger if exists digital_task_stamp_assigned on public.digital_tasks;
create trigger digital_task_stamp_assigned before insert or update on public.digital_tasks for each row execute function public.digital_task_stamp_assigned();
