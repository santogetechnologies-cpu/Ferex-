-- =============================================================================
-- Migration 002: Ferex Digital Agency ERP Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.digital_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_code TEXT NOT NULL UNIQUE DEFAULT ('CLT-' || floor(random() * 900 + 100)::text),
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT DEFAULT 'Mumbai',
  client_type TEXT NOT NULL DEFAULT 'Enterprise' CHECK (client_type IN ('Enterprise', 'SMB', 'Startup', 'Government')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Inactive', 'Archived')),
  total_spent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  service_interest TEXT NOT NULL DEFAULT 'Web Development',
  estimated_value NUMERIC(14, 2) DEFAULT 500000,
  stage TEXT NOT NULL DEFAULT 'New Lead' CHECK (stage IN ('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost')),
  source TEXT DEFAULT 'Inbound Website',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code TEXT NOT NULL UNIQUE DEFAULT ('PRJ-' || floor(random() * 9000 + 1000)::text),
  title TEXT NOT NULL,
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  service_category TEXT NOT NULL DEFAULT 'Web Development' CHECK (service_category IN ('Web Development', 'Mobile Apps', 'UI/UX Design', 'Digital Marketing', 'SEO', 'Branding & Identity')),
  budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  deadline DATE,
  lead_engineer TEXT DEFAULT 'Senior Architect',
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('Planning', 'In Progress', 'In Review', 'Completed', 'On Hold', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  project_name TEXT DEFAULT '',
  title TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT 'Lead Developer',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Testing', 'Completed')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT ('INV-DIG-' || floor(random() * 90000 + 10000)::text),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE SET NULL,
  project_title TEXT DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft', 'Issued', 'Pending', 'Paid', 'Overdue', 'Cancelled')),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('Cloud Infrastructure', 'Software Licenses', 'Freelancer Payroll', 'Office & Utilities', 'Marketing & Ads', 'Hardware')),
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vendor TEXT NOT NULL DEFAULT 'AWS Cloud / Tools',
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Corporate Credit Card',
  approved_by TEXT DEFAULT 'Digital Director',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emp_code TEXT NOT NULL UNIQUE DEFAULT ('EMP-' || floor(random() * 900 + 100)::text),
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Engineering' CHECK (department IN ('Engineering', 'Design', 'Marketing', 'QA', 'Management', 'Sales')),
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  salary NUMERIC(12, 2) NOT NULL DEFAULT 75000,
  performance_score NUMERIC(3, 1) DEFAULT 4.8,
  active_tasks_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Resigned')),
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_seo_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL,
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  organic_traffic_monthly INTEGER DEFAULT 45000,
  keywords_top_10 INTEGER DEFAULT 185,
  domain_authority INTEGER DEFAULT 42,
  health_score INTEGER DEFAULT 94,
  backlinks_count INTEGER DEFAULT 12400,
  status TEXT DEFAULT 'Campaign Active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime publication for Digital ERP
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.digital_clients,
  public.digital_leads,
  public.digital_projects,
  public.digital_tasks,
  public.digital_invoices;
