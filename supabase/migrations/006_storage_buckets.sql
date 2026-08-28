-- =============================================================================
-- Migration 006: Supabase Storage Buckets & Policies Provisioning (Private & Secured)
-- =============================================================================

-- 1. Upsert Buckets with Strict Privacy Settings (Sensitive Vaults = Private)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('student-documents', 'student-documents', false),
  ('offer-letters', 'offer-letters', false),
  ('receipts', 'receipts', false),
  ('trade-documents', 'trade-documents', false),
  ('digital-assets', 'digital-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Storage Policies for student-documents (Private Bucket)
DROP POLICY IF EXISTS "Public & Authenticated Read student-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert student-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update student-documents" ON storage.objects;

CREATE POLICY "Authenticated Read student-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-documents' AND (auth.role() = 'authenticated' OR public.is_admin_or_staff()));

CREATE POLICY "Authenticated Insert student-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update student-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-documents' AND (auth.role() = 'authenticated' OR public.is_admin_or_staff()));

CREATE POLICY "Admin Delete student-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-documents' AND public.is_admin_or_staff());

-- 3. Storage Policies for offer-letters (Private Bucket)
DROP POLICY IF EXISTS "Public & Authenticated Read offer-letters" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert offer-letters" ON storage.objects;

CREATE POLICY "Authenticated Read offer-letters"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-letters' AND (auth.role() = 'authenticated' OR public.is_admin_or_staff()));

CREATE POLICY "Staff & Admin Insert offer-letters"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'offer-letters' AND public.is_admin_or_staff());

-- 4. Storage Policies for receipts (Private Bucket)
DROP POLICY IF EXISTS "Public & Authenticated Read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert receipts" ON storage.objects;

CREATE POLICY "Authenticated Read receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND (auth.role() = 'authenticated' OR public.is_admin_or_staff()));

CREATE POLICY "Authenticated Insert receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- 5. Storage Policies for trade-documents (Private Bucket)
CREATE POLICY "Authenticated Read trade-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-documents' AND (auth.role() = 'authenticated' OR public.is_admin_or_staff()));

CREATE POLICY "Authenticated Insert trade-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trade-documents' AND auth.role() = 'authenticated');
