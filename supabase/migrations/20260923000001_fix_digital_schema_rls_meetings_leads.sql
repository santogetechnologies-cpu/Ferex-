-- =============================================================================
-- FEREX DIGITAL SOLUTIONS ERP - SCHEMA FIXES, COLUMN ALIGNMENT & RLS POLICIES
-- Migration: 20260923000001_fix_digital_schema_rls_meetings_leads.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DIGITAL MEETINGS TABLE FIXES (ensure updated_at and all standard fields exist)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  host_staff_name TEXT DEFAULT '',
  host_staff_email TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_display TEXT DEFAULT '',
  date_display DATE DEFAULT CURRENT_DATE,
  platform TEXT DEFAULT 'Google Meet',
  meeting_type TEXT DEFAULT 'Discovery Call',
  meeting_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Scheduled',
  agenda TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was already created by earlier migrations
ALTER TABLE public.digital_meetings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS time_display TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_display DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'Google Meet',
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'Discovery Call',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Make sure client_id is nullable if present
ALTER TABLE public.digital_meetings ALTER COLUMN client_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DIGITAL CLIENTS & LEADS TABLE FIXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  industry TEXT DEFAULT 'Technology',
  status TEXT NOT NULL DEFAULT 'Active',
  total_revenue NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_clients
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'External';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DIGITAL TASKS TABLE FIXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'To Do',
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_date TEXT DEFAULT '',
  assigned_to_name TEXT DEFAULT '',
  assigned_to_email TEXT DEFAULT '',
  assigned_staff_id UUID,
  notes TEXT DEFAULT '',
  project_title TEXT DEFAULT '',
  task_type TEXT DEFAULT 'Task',
  sprint_id UUID,
  sprint_name TEXT DEFAULT '',
  story_points INTEGER DEFAULT 1,
  milestone_id UUID,
  milestone_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_tasks
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Task',
  ADD COLUMN IF NOT EXISTS sprint_id UUID,
  ADD COLUMN IF NOT EXISTS sprint_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS milestone_id UUID,
  ADD COLUMN IF NOT EXISTS milestone_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DIGITAL PROJECTS TABLE FIXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  service_category TEXT NOT NULL DEFAULT 'Web & App Development',
  status TEXT NOT NULL DEFAULT 'Briefing',
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  progress INTEGER NOT NULL DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  lead_developer TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_projects
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Advance Payment',
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_paid NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL DIGITAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.digital_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_meetings ENABLE ROW LEVEL SECURITY;

-- Drop previous restrictive policies
DROP POLICY IF EXISTS "digital_tasks_all" ON public.digital_tasks;
DROP POLICY IF EXISTS "digital_tasks_anon" ON public.digital_tasks;
DROP POLICY IF EXISTS "digital_projects_all" ON public.digital_projects;
DROP POLICY IF EXISTS "digital_projects_anon" ON public.digital_projects;
DROP POLICY IF EXISTS "digital_clients_all" ON public.digital_clients;
DROP POLICY IF EXISTS "digital_clients_anon" ON public.digital_clients;
DROP POLICY IF EXISTS "digital_meetings_all" ON public.digital_meetings;
DROP POLICY IF EXISTS "digital_meetings_anon" ON public.digital_meetings;

-- Create permissive authenticated & anon policies for digital operations
CREATE POLICY "digital_tasks_all" ON public.digital_tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_tasks_anon" ON public.digital_tasks
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_projects_all" ON public.digital_projects
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_projects_anon" ON public.digital_projects
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_clients_all" ON public.digital_clients
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_clients_anon" ON public.digital_clients
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_meetings_all" ON public.digital_meetings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "digital_meetings_anon" ON public.digital_meetings
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Ensure other digital tables also allow authenticated operations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_invoices') THEN
    ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "digital_invoices_all" ON public.digital_invoices;
    CREATE POLICY "digital_invoices_all" ON public.digital_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_deliverables') THEN
    ALTER TABLE public.digital_deliverables ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "digital_deliverables_all" ON public.digital_deliverables;
    CREATE POLICY "digital_deliverables_all" ON public.digital_deliverables FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_sprints') THEN
    ALTER TABLE public.digital_sprints ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "digital_sprints_all" ON public.digital_sprints;
    CREATE POLICY "digital_sprints_all" ON public.digital_sprints FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_milestones') THEN
    ALTER TABLE public.digital_milestones ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "digital_milestones_all" ON public.digital_milestones;
    CREATE POLICY "digital_milestones_all" ON public.digital_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_tickets') THEN
    ALTER TABLE public.digital_tickets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "digital_tickets_all" ON public.digital_tickets;
    CREATE POLICY "digital_tickets_all" ON public.digital_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REALTIME REPLICATION PUBLICATION
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'digital_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'digital_projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_projects;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'digital_clients') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_clients;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'digital_meetings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_meetings;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
