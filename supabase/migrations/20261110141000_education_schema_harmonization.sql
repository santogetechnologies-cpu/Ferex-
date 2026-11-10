-- ============================================================================
-- Migration: 20261110141000_education_schema_harmonization.sql
-- Description: Creates document_requirements, harmonizes visa, pre-departure, chat and documents tables
-- ============================================================================

-- 1. Create public.document_requirements
CREATE TABLE IF NOT EXISTS public.document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'General',
  is_required BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  processing_time TEXT DEFAULT '3 - 7 Days',
  authority_fee TEXT DEFAULT 'Free',
  checklist_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_country ON public.document_requirements(country);

ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_req_read_policy" ON public.document_requirements;
DROP POLICY IF EXISTS "doc_req_admin_manage_policy" ON public.document_requirements;

CREATE POLICY "doc_req_read_policy" ON public.document_requirements
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "doc_req_admin_manage_policy" ON public.document_requirements
  FOR ALL TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin')
    OR auth.role() = 'service_role'
  );

GRANT SELECT ON public.document_requirements TO anon, authenticated;
GRANT ALL ON public.document_requirements TO authenticated, service_role;

-- 2. Add Missing Columns to public.student_documents
ALTER TABLE public.student_documents
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.document_requirements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type TEXT;

-- Sync name and file_name if one is null
CREATE OR REPLACE FUNCTION public.sync_student_document_columns()
RETURNS trigger AS $$
BEGIN
  IF NEW.file_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.file_name := NEW.name;
  ELSIF NEW.name IS NULL AND NEW.file_name IS NOT NULL THEN
    NEW.name := NEW.file_name;
  END IF;

  IF NEW.doc_type IS NULL AND NEW.type IS NOT NULL THEN
    NEW.doc_type := NEW.type;
  ELSIF NEW.type IS NULL AND NEW.doc_type IS NOT NULL THEN
    NEW.type := NEW.doc_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_document_columns ON public.student_documents;
CREATE TRIGGER trg_sync_student_document_columns
  BEFORE INSERT OR UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_document_columns();

-- 3. Add Missing Columns to public.visa_applications
ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS decision_outcome TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS courier_tracking_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passport_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS vfs_ref_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status_label TEXT DEFAULT 'VFS Processing';

-- Relax check constraint on status if it exists to allow 8-stage progress labels
ALTER TABLE public.visa_applications DROP CONSTRAINT IF EXISTS visa_applications_status_check;

-- 4. Add Missing Columns to public.pre_departure_checklists
ALTER TABLE public.pre_departure_checklists
  ADD COLUMN IF NOT EXISTS airline TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS flight_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS departure_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_city TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dorm_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dorm_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS room_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_driver TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_contact TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_details TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS clearance_status TEXT DEFAULT 'Pending';

-- 5. Harmonize Chat Tables (support both content/message and sent_at/created_at)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_attachment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT '';

CREATE OR REPLACE FUNCTION public.sync_chat_message_columns()
RETURNS trigger AS $$
BEGIN
  IF NEW.message IS NULL AND NEW.content IS NOT NULL THEN
    NEW.message := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.message IS NOT NULL THEN
    NEW.content := NEW.message;
  END IF;

  IF NEW.created_at IS NULL AND NEW.sent_at IS NOT NULL THEN
    NEW.created_at := NEW.sent_at;
  ELSIF NEW.sent_at IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.sent_at := NEW.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_chat_message_columns ON public.chat_messages;
CREATE TRIGGER trg_sync_chat_message_columns
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_chat_message_columns();

-- Ensure public.conversations has participant_ids
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS participant_ids TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 6. Add assigned_staff_name to public.support_tickets to prevent UUID crash
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '';

