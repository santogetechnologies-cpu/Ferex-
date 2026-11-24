-- Legalization files were created once per approved document and always for Poland/NAWA. Merge them into one file per
-- student, assign the country the student actually applied to, and prevent duplicates from now on.
with country_of as (
  select u.id as student_id,
         coalesce(nullif(case when lower(u.target_country) in ('', 'not set') then null else u.target_country end, ''),
                  (select un.country from public.applications a join public.universities un on un.id = a.university_id where a.student_id = u.id order by a.created_at limit 1)) as country
  from public.users u
), ranked as (
  select l.id, l.student_id, c.country,
         row_number() over (partition by l.student_id order by (l.status = 'Approved') desc, l.current_step desc, l.created_at desc) as rn
  from public.legalization_records l left join country_of c on c.student_id = l.student_id
)
delete from public.legalization_records l using ranked r where l.id = r.id and r.rn > 1;

update public.legalization_records l set country = c.country, authority_acronym = case when lower(c.country) = 'poland' then l.authority_acronym else '' end,
  authority = case when lower(c.country) = 'poland' then l.authority else '' end, updated_at = now()
from (select u.id as student_id,
             coalesce(nullif(case when lower(u.target_country) in ('', 'not set') then null else u.target_country end, ''),
                      (select un.country from public.applications a join public.universities un on un.id = a.university_id where a.student_id = u.id order by a.created_at limit 1)) as country
      from public.users u) c
where c.student_id = l.student_id and c.country is not null and lower(l.country) is distinct from lower(c.country);

create unique index if not exists legalization_one_per_student_country on public.legalization_records (student_id, lower(country)) where student_id is not null;
