-- Migration: 20260917000008_digital_pm_and_internal_clients.sql
-- Description: Sets up pure Supabase tables for Digital Project Manager (sprints, milestones, tickets, tasks, deliverables) and updates internal clients to official FEREX subsidiaries.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND DIGITAL_PROJECTS & DIGITAL_TASKS WITH PM ASSIGNMENT COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.digital_projects
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Advance Payment',
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.digital_tasks
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
  ADD COLUMN IF NOT EXISTS milestone_name TEXT DEFAULT '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DIGITAL SPRINTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  project_title TEXT DEFAULT '',
  name TEXT NOT NULL,
  goal TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Planning', 'Active', 'Completed', 'Archived')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_sprints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "digital_sprints_all" ON public.digital_sprints FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DIGITAL MILESTONES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  project_title TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'In Review', 'Completed', 'Approved')),
  deliverables_summary TEXT DEFAULT '',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  payment_percentage NUMERIC(5, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "digital_milestones_all" ON public.digital_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DIGITAL TICKETS (Client Support & Revision Tickets)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL DEFAULT ('TKT-' || substring(gen_random_uuid()::text, 1, 6)),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  project_title TEXT DEFAULT '',
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  client_name TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to_name TEXT DEFAULT '',
  assigned_to_email TEXT DEFAULT '',
  assigned_staff_id UUID,
  resolution_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "digital_tickets_all" ON public.digital_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. UPDATE DIGITAL_CLIENTS TO PROPER FEREX SUBSIDIARIES & INTERNAL DIVISIONS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.digital_clients
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Internal';

-- Delete any legacy mock or test client records with outdated names
DELETE FROM public.digital_clients 
WHERE company_name ILIKE '%C Tech%' 
   OR company_name ILIKE '%Santoge Digital%'
   OR company_name ILIKE '%Mock%';

-- Upsert official FEREX Internal sister divisions
INSERT INTO public.digital_clients (
  id, company_name, contact_person, email, phone, industry, status, total_revenue, client_type, created_at, updated_at
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'FEREX Global Education',
    'Admissions Director',
    'education@ferex.com',
    '+91 98190 11001',
    'Global Education & University Admissions',
    'Active',
    0.00,
    'Internal',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'FEREX Global Trade',
    'Trade Logistics Lead',
    'trade@ferex.com',
    '+91 98190 11002',
    'International Commodities & Trade',
    'Active',
    0.00,
    'Internal',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Rimi Frozen Foods Distribution',
    'Operations Director',
    'rimi@ferex.com',
    '+91 98190 11003',
    'Cold Chain Distribution & Logistics',
    'Active',
    0.00,
    'Internal',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'FEREX Corporate / Central HQ',
    'Executive Super Admin',
    'admin@ferex.com',
    '+91 98190 11000',
    'Corporate Holding & Strategy',
    'Active',
    0.00,
    'Internal',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_person = EXCLUDED.contact_person,
  email = EXCLUDED.email,
  industry = EXCLUDED.industry,
  client_type = EXCLUDED.client_type,
  updated_at = NOW();
