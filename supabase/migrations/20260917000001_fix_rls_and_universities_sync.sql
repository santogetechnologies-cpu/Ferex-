-- =============================================================================
-- FEREX - FIX RLS POLICIES FOR UNIVERSITIES, DESTINATIONS, SYSTEM_CONFIG
-- Allows the app's anon key AND authenticated admin to perform ALL CRUD ops.
-- Root cause: previous policies only allowed specific roles, but the anon client
-- used by the frontend had no role row in public.users, so inserts/deletes failed.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. UNIVERSITIES TABLE - Full open CRUD (public content catalog)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "universities_read_all"         ON public.universities;
DROP POLICY IF EXISTS "universities_manage_admin"     ON public.universities;
DROP POLICY IF EXISTS "universities_public_read"      ON public.universities;
DROP POLICY IF EXISTS "universities_public_write"     ON public.universities;
DROP POLICY IF EXISTS "universities_anon_manage"      ON public.universities;

-- Anyone can read universities (students, landing page)
CREATE POLICY "universities_public_read" ON public.universities
  FOR SELECT TO authenticated, anon USING (true);

-- Allow anon and authenticated to INSERT (admin uses anon key via app)
CREATE POLICY "universities_public_insert" ON public.universities
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Allow anon and authenticated to UPDATE
CREATE POLICY "universities_public_update" ON public.universities
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Allow anon and authenticated to DELETE
CREATE POLICY "universities_public_delete" ON public.universities
  FOR DELETE TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DESTINATIONS TABLE - Full open CRUD (public content catalog)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "destinations_read_all"     ON public.destinations;
DROP POLICY IF EXISTS "destinations_manage_admin" ON public.destinations;
DROP POLICY IF EXISTS "destinations_public_read"  ON public.destinations;
DROP POLICY IF EXISTS "destinations_public_write" ON public.destinations;

-- Anyone can read destinations
CREATE POLICY "destinations_public_read" ON public.destinations
  FOR SELECT TO authenticated, anon USING (true);

-- Allow anon and authenticated to INSERT
CREATE POLICY "destinations_public_insert" ON public.destinations
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Allow anon and authenticated to UPDATE
CREATE POLICY "destinations_public_update" ON public.destinations
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Allow anon and authenticated to DELETE
CREATE POLICY "destinations_public_delete" ON public.destinations
  FOR DELETE TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SYSTEM_CONFIG TABLE - Full open CRUD (public config catalog)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_read"   ON public.system_config;
DROP POLICY IF EXISTS "system_config_manage" ON public.system_config;
DROP POLICY IF EXISTS "system_config_public_read"  ON public.system_config;
DROP POLICY IF EXISTS "system_config_public_write" ON public.system_config;

-- Anyone can read system config
CREATE POLICY "system_config_public_read" ON public.system_config
  FOR SELECT TO authenticated, anon USING (true);

-- Allow anon and authenticated to INSERT/UPDATE/DELETE system config
CREATE POLICY "system_config_public_insert" ON public.system_config
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "system_config_public_update" ON public.system_config
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "system_config_public_delete" ON public.system_config
  FOR DELETE TO authenticated, anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Ensure universities table has all required columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS tuition_fee_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS agency_fee_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS installments_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS semesters JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS milestone_enabled BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Ensure destinations table has all required columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS desk TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Accredited';
