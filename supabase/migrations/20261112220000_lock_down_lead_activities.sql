-- This policy granted ALL (read/update/delete) on lead activities to the public role with USING (true).
-- Staff access is already covered by "Lead activities staff access"; anonymous visitors only need INSERT
-- (the enquiry form logs the first activity), which "Public can insert lead activities" keeps.
DROP POLICY IF EXISTS "Education staff and admin have full access to activities" ON public.education_lead_activities;
