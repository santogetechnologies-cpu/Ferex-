-- ─────────────────────────────────────────────────────────────────────────────
-- FEREX ENTERPRISE ERP — COMPREHENSIVE SCHEMA ALIGNMENT & SYSTEM FIXES
-- Migration: 20261008000002_complete_system_fixes_and_schema_alignment.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. USERS & STUDENTS TABLE COLUMNS & EXTENDED ROLE CONSTRAINT
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS target_country TEXT,
  ADD COLUMN IF NOT EXISTS destination_country TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'superadmin', 'super_admin', 'central',
      'admin', 'education_admin', 'education', 'staff', 'counselor',
      'digital', 'digital_admin', 'ferex_digital', 'digital_manager', 'project_manager', 'digital_staff', 'pm', 'digimanager', 'designer', 'developer',
      'trade', 'trade_admin', 'global_trade', 'logistics_officer',
      'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'warehouse_manager',
      'student', 'trade_client', 'rimi_client', 'digital_client'
    )
  );

-- 2. SEED DEFAULT DIVISION STAFF IN PUBLIC.USERS TABLE (PREVENTS FOREIGN KEY VIOLATIONS)
INSERT INTO public.users (id, email, full_name, role, department, phone, status)
VALUES
  ('11111111-1111-4111-a111-111111111001', 'pm@ferex.com', 'Digital Project Manager', 'project_manager', 'Digital Project Management', '+91 98190 20001', 'active'),
  ('11111111-1111-4111-a111-111111111002', 'digital@ferex.com', 'Ferex Digital Director', 'digital_admin', 'Digital Agency HQ', '+91 98190 20002', 'active'),
  ('11111111-1111-4111-a111-111111111003', 'digimanager@ferex.com', 'Digital Manager', 'project_manager', 'Digital Operations', '+91 98190 20003', 'active'),
  ('11111111-1111-4111-a111-111111111004', 'creative@ferex.com', 'Lead Creative Designer', 'digital_staff', 'Creative & Design', '+91 98190 20004', 'active'),
  ('22222222-2222-4222-a222-222222222001', 'trade@ferex.com', 'Global Trade Director', 'trade_admin', 'Trade Logistics', '+91 98190 30001', 'active'),
  ('33333333-3333-4333-a333-333333333001', 'rimi@ferex.com', 'Rimi Operations Lead', 'rimi_admin', 'Cold Chain Logistics', '+91 98190 40001', 'active'),
  ('44444444-4444-4444-a444-444444444001', 'education@ferex.com', 'Admissions Lead Counselor', 'education_admin', 'Student Admissions', '+91 98190 10001', 'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  phone = EXCLUDED.phone;

-- 3. RIMI FROZEN FOODS DISTRIBUTION SCHEMA
ALTER TABLE IF EXISTS public.rimi_customers
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'Shop / Retailer',
  ADD COLUMN IF NOT EXISTS contact_person TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS gst_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Mumbai',
  ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maharashtra',
  ADD COLUMN IF NOT EXISTS pincode TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS territory TEXT DEFAULT 'West Zone',
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT 'Sales Officer',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT 'sales@ferex.com',
  ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 100000.00,
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Current',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.rimi_deliveries
  ADD COLUMN IF NOT EXISTS arrival_temp TEXT DEFAULT '-18.0°C',
  ADD COLUMN IF NOT EXISTS delivery_no TEXT,
  ADD COLUMN IF NOT EXISTS order_no TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS destination_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS vehicle_id UUID,
  ADD COLUMN IF NOT EXISTS route_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS challan_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.rimi_payments
  ADD COLUMN IF NOT EXISTS collected_by_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_no TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS order_no TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.rimi_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Delivery',
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Central Admin';

-- 4. DIGITAL AGENCY CRM & PROJECTS SCHEMA
ALTER TABLE IF EXISTS public.digital_projects
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT 'Digital Project Manager',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT 'pm@ferex.com',
  ADD COLUMN IF NOT EXISTS lead_developer TEXT DEFAULT 'Digital Project Manager',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT 'Enterprise Client',
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'Digital Marketing & Advertising',
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) DEFAULT 500000.00,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Advance Payment',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Briefing',
  ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.digital_tasks
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Task',
  ADD COLUMN IF NOT EXISTS is_central_directive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.digital_deliverables
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Figma',
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Submitted',
  ADD COLUMN IF NOT EXISTS approved_by_client BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 5. FEREX GLOBAL TRADE SCHEMA
ALTER TABLE IF EXISTS public.trade_clients
  ADD COLUMN IF NOT EXISTS vat_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Buyer / Importer',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14, 2) DEFAULT 500000.00,
  ADD COLUMN IF NOT EXISTS portal_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.trade_documents
  ADD COLUMN IF NOT EXISTS doc_number TEXT,
  ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'Commercial Invoice',
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_size TEXT DEFAULT '245 KB',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Submitted',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'Operations Desk',
  ADD COLUMN IF NOT EXISTS sent_to_client BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_to_client_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.trade_tasks
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Order Handling',
  ADD COLUMN IF NOT EXISTS order_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 6. SUPPORT TICKETS SCHEMA
ALTER TABLE IF EXISTS public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS ticket_no TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by TEXT DEFAULT '';

-- 7. CROSS-APP CORE TASKS TABLE
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Central Admin',
  ADD COLUMN IF NOT EXISTS student_id UUID,
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- 8. UNIFIED ROW LEVEL SECURITY (RLS) POLICIES FOR ALL SUBSIDIARY TABLES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'rimi_customers', 'rimi_deliveries', 'rimi_payments', 'rimi_tasks', 'rimi_customer_activities', 'rimi_sales_orders', 'rimi_inventory',
        'digital_projects', 'digital_tasks', 'digital_deliverables', 'digital_clients', 'digital_milestones', 'digital_meetings',
        'trade_clients', 'trade_documents', 'trade_orders', 'trade_tasks', 'trade_invoices', 'trade_payments',
        'support_tickets', 'tasks', 'users'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated_access" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_authenticated_access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_read" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_read" ON public.%I FOR SELECT TO anon USING (true);', tbl, tbl);
  END LOOP;
END $$;

-- 9. ADD TABLES TO SUPABASE REALTIME PUBLICATION
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'rimi_customers', 'rimi_deliveries', 'rimi_payments', 'rimi_tasks',
        'digital_projects', 'digital_tasks', 'digital_deliverables', 'digital_clients',
        'trade_clients', 'trade_documents', 'trade_orders', 'trade_tasks',
        'support_tickets', 'tasks', 'users'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 10. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE IMMEDIATELY
NOTIFY pgrst, 'reload schema';
