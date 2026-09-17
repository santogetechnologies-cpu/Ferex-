-- =============================================================================
-- FEREX - ENSURE ALL COLUMNS ON UNIVERSITIES & DESTINATIONS TABLES
-- Migration: 20260917000003_fix_universities_schema_columns.sql
-- =============================================================================

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Accredited Partner',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Higher Education',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tuition_range TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS intakes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS university_fee TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tuition_fee_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS vfs_fee TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_fee TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_fee_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS living_cost_monthly TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nawa_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS installments_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_programs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS semesters JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ranking INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS programs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS desk TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Accredited',
  ADD COLUMN IF NOT EXISTS authority TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS acronym TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS processing TEXT DEFAULT '15-30 Days',
  ADD COLUMN IF NOT EXISTS fee TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Reload PostgREST schema cache so Supabase immediately recognizes new columns
NOTIFY pgrst, 'reload schema';
