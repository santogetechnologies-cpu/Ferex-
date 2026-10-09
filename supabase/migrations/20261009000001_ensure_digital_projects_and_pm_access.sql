-- Migration: 20261009000001_ensure_digital_projects_and_pm_access.sql
-- Description: Ensures digital_projects schema resilience, foreign keys, RLS permissions for all roles (including Digital Manager), and realtime sync.

-- 1. USERS ROLE CHECK CONSTRAINT & SEEDING
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'student', 'admin', 'education_admin', 'education', 'super_admin', 'superadmin', 'central',
      'staff', 'counselor', 'trade', 'trade_admin', 'global_trade', 'logistics_officer',
      'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'rimi_staff',
      'digital', 'digital_admin', 'ferex_digital', 'digital_manager', 'project_manager', 'digital_staff', 'pm', 'digimanager', 'designer', 'developer',
      'trade_client', 'rimi_client', 'digital_client'
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Seed / update default digital team users by email
INSERT INTO public.users (id, email, full_name, role, department, phone, status)
VALUES
  ('11111111-1111-4111-a111-111111111002', 'digital@ferex.com', 'Ferex Digital Director', 'digital_admin', 'Digital Agency HQ', '+91 98190 20002', 'active'),
  ('11111111-1111-4111-a111-111111111003', 'digimanager@ferex.com', 'Digital Manager', 'project_manager', 'Digital Operations', '+91 98190 20003', 'active'),
  ('11111111-1111-4111-a111-111111111005', 'pm@ferex.com', 'Digital Project Manager', 'project_manager', 'Digital Project Management', '+91 98190 20005', 'active'),
  ('11111111-1111-4111-a111-111111111004', 'creative@ferex.com', 'Lead Creative Designer', 'digital_staff', 'Creative & Design', '+91 98190 20004', 'active')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  status = EXCLUDED.status;

-- 2. SEED OFFICIAL FEREX INTERNAL SISTER SUBSIDIARIES
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
  client_type = EXCLUDED.client_type,
  updated_at = NOW();

-- 3. ALIGN DIGITAL PROJECTS TABLE SCHEMA
ALTER TABLE IF EXISTS public.digital_projects
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT 'Digital Project Manager',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT 'digimanager@ferex.com',
  ADD COLUMN IF NOT EXISTS lead_developer TEXT DEFAULT 'Digital Project Manager',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT 'Enterprise Client',
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'Digital Marketing & Advertising',
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) DEFAULT 500000.00,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Advance Payment',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2) DEFAULT 150000.00,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 350000.00,
  ADD COLUMN IF NOT EXISTS balance_paid NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Briefing',
  ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Digital Admin';

-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR DIGITAL & RELATED TABLES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'digital_projects', 'digital_tasks', 'digital_deliverables', 'digital_clients', 'digital_milestones', 'digital_meetings', 'digital_tickets',
        'tasks', 'users'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated_access" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_read" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- 5. REALTIME REPLICATION PUBLICATION
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'digital_projects', 'digital_tasks', 'digital_deliverables', 'digital_clients', 'digital_milestones', 'digital_tickets'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
