-- A payment plan can be confirmed before the student has picked a destination.
alter table public.education_student_preferences alter column country drop not null;

create or replace function public.guard_education_destination()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.country is null or btrim(new.country) = '' then
    new.country := null;
    return new;
  end if;
  if not exists (select 1 from public.destinations where lower(btrim(name)) = lower(btrim(new.country)))
     and not exists (select 1 from public.universities where lower(btrim(country)) = lower(btrim(new.country)) and is_active) then
    raise exception 'Choose a registered study destination';
  end if;
  return new;
end $$;
