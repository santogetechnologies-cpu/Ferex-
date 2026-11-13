-- Student files (passports, certificates, offer letters, receipts) were in PUBLIC buckets that anyone could list and
-- any signed-in user could overwrite or delete. Education buckets become private; access is by owner folder or staff.
CREATE OR REPLACE FUNCTION public.storage_can_read_education_object(p_bucket text, p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_education_staff()
      OR (storage.foldername(p_name))[1] = auth.uid()::text
      OR (p_bucket = 'offer-letters' AND EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.student_id = auth.uid()
              AND (position(p_name in coalesce(a.offer_letter_url, '')) > 0 OR position(p_name in coalesce(a.final_acceptance_url, '')) > 0)))
$$;
REVOKE ALL ON FUNCTION public.storage_can_read_education_object(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_can_read_education_object(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;
DROP POLICY IF EXISTS "edu_objects_read" ON storage.objects;
DROP POLICY IF EXISTS "other_objects_read" ON storage.objects;
DROP POLICY IF EXISTS "edu_objects_insert" ON storage.objects;
DROP POLICY IF EXISTS "other_objects_insert" ON storage.objects;
DROP POLICY IF EXISTS "objects_update_owner_or_staff" ON storage.objects;
DROP POLICY IF EXISTS "objects_delete_owner_or_staff" ON storage.objects;

CREATE POLICY "edu_objects_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('student-documents', 'documents', 'offer-letters', 'receipts', 'invoices') AND public.storage_can_read_education_object(bucket_id, name));
CREATE POLICY "other_objects_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id NOT IN ('student-documents', 'documents', 'offer-letters', 'receipts', 'invoices'));
CREATE POLICY "edu_objects_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('student-documents', 'documents', 'offer-letters', 'receipts', 'invoices')
              AND (public.is_education_staff() OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "other_objects_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id NOT IN ('student-documents', 'documents', 'offer-letters', 'receipts', 'invoices'));
CREATE POLICY "objects_update_owner_or_staff" ON storage.objects FOR UPDATE TO authenticated
  USING (owner = auth.uid() OR public.is_internal_staff()) WITH CHECK (owner = auth.uid() OR public.is_internal_staff());
CREATE POLICY "objects_delete_owner_or_staff" ON storage.objects FOR DELETE TO authenticated
  USING (owner = auth.uid() OR public.is_internal_staff());

UPDATE storage.buckets SET public = false WHERE id IN ('student-documents', 'documents', 'offer-letters', 'receipts', 'invoices');
