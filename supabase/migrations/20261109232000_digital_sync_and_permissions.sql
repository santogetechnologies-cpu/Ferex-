-- Supabase migration to restore and grant permissions for Digital Agency tables
-- Ensures cross-role synchronization between Digital Manager and Digital Admin

BEGIN;

-- 1. Ensure essential tables exist
CREATE TABLE IF NOT EXISTS public.digital_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  name text,
  contact_person text,
  email text,
  phone text,
  industry text,
  city text,
  client_type text DEFAULT 'External',
  status text DEFAULT 'Active',
  total_revenue numeric DEFAULT 0,
  notes text,
  tags text[],
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  client_name text,
  client_type text DEFAULT 'Internal',
  title text NOT NULL,
  service_category text,
  scope text,
  description text,
  budget numeric DEFAULT 0,
  currency text DEFAULT 'INR',
  country text,
  progress numeric DEFAULT 0,
  status text DEFAULT 'Briefing',
  start_date date,
  deadline date,
  assigned_staff_id uuid,
  assigned_staff_name text,
  assigned_staff_email text,
  lead_developer text,
  payment_terms text DEFAULT 'Advance Payment',
  payment_split_type text,
  payment_status text DEFAULT 'Pending',
  advance_percentage numeric,
  advance_amount numeric DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  balance_amount numeric DEFAULT 0,
  balance_paid numeric DEFAULT 0,
  milestones jsonb DEFAULT '[]'::jsonb,
  deliverables jsonb DEFAULT '[]'::jsonb,
  stage_history jsonb DEFAULT '[]'::jsonb,
  created_by text,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  project_title text,
  title text NOT NULL,
  priority text DEFAULT 'Medium',
  status text DEFAULT 'To Do',
  due_date date,
  assigned_to_name text,
  assigned_to_email text,
  assigned_staff_id uuid,
  notes text,
  task_type text DEFAULT 'Task',
  sprint_id uuid,
  milestone_id uuid,
  story_points numeric DEFAULT 1,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.digital_projects(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  status text DEFAULT 'Sent',
  currency text DEFAULT 'INR',
  notes text,
  payment_part_label text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'Pending',
  completion_percentage numeric DEFAULT 0,
  payment_percentage numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  version text DEFAULT 'v1.0',
  status text DEFAULT 'Submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  project_id uuid,
  title text NOT NULL,
  host_staff_email text,
  host_staff_name text,
  scheduled_at timestamptz,
  meet_link text,
  status text DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Grant table permissions to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL ON TABLE public.digital_clients TO anon, authenticated;
GRANT ALL ON TABLE public.digital_projects TO anon, authenticated;
GRANT ALL ON TABLE public.digital_tasks TO anon, authenticated;
GRANT ALL ON TABLE public.digital_invoices TO anon, authenticated;
GRANT ALL ON TABLE public.digital_milestones TO anon, authenticated;
GRANT ALL ON TABLE public.digital_deliverables TO anon, authenticated;
GRANT ALL ON TABLE public.digital_contracts TO anon, authenticated;
GRANT ALL ON TABLE public.digital_meetings TO anon, authenticated;

-- 3. Enable RLS with permissive policies for collaborative agency workflow
ALTER TABLE public.digital_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_clients" ON public.digital_clients;
CREATE POLICY "permit_all_digital_clients" ON public.digital_clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_projects" ON public.digital_projects;
CREATE POLICY "permit_all_digital_projects" ON public.digital_projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_tasks" ON public.digital_tasks;
CREATE POLICY "permit_all_digital_tasks" ON public.digital_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_invoices" ON public.digital_invoices;
CREATE POLICY "permit_all_digital_invoices" ON public.digital_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_milestones" ON public.digital_milestones;
CREATE POLICY "permit_all_digital_milestones" ON public.digital_milestones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_deliverables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_deliverables" ON public.digital_deliverables;
CREATE POLICY "permit_all_digital_deliverables" ON public.digital_deliverables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_contracts" ON public.digital_contracts;
CREATE POLICY "permit_all_digital_contracts" ON public.digital_contracts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.digital_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_all_digital_meetings" ON public.digital_meetings;
CREATE POLICY "permit_all_digital_meetings" ON public.digital_meetings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

COMMIT;

