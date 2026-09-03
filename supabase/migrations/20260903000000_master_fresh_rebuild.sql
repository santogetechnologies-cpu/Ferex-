-- =============================================================================
-- FEREX ENTERPRISE PLATFORM - COMPLETE FRESH DATABASE SCHEMA & GOVERNANCE
-- =============================================================================
-- Super Admin Direct Auth + 4 Platform Enterprise Division Admin Management:
-- 1. Ferex Global Education Admin (role: 'admin' / 'education_admin')
-- 2. Global Trade ERP Admin (role: 'trade' / 'trade_admin')
-- 3. Rimi Distribution ERP Admin (role: 'rimi' / 'rimi_admin')
-- 4. Ferex Digital Agency Admin (role: 'digital' / 'digital_admin')
-- + Central Super Admin (role: 'superadmin' / 'central' - Direct Auth Master)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: CLEAN DROP ALL EXISTING OBJECTS (FRESH RESET)
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.central_enterprise_overview CASCADE;
DROP FUNCTION IF EXISTS public.get_central_dashboard_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_division_admin(TEXT, TEXT, TEXT, TEXT) CASCADE;

DROP TABLE IF EXISTS public.central_audit_logs CASCADE;
DROP TABLE IF EXISTS public.rimi_payments CASCADE;
DROP TABLE IF EXISTS public.rimi_deliveries CASCADE;
DROP TABLE IF EXISTS public.rimi_order_items CASCADE;
DROP TABLE IF EXISTS public.rimi_sales_orders CASCADE;
DROP TABLE IF EXISTS public.rimi_inventory CASCADE;
DROP TABLE IF EXISTS public.rimi_products CASCADE;
DROP TABLE IF EXISTS public.rimi_distributors CASCADE;
DROP TABLE IF EXISTS public.trade_invoices CASCADE;
DROP TABLE IF EXISTS public.trade_documents CASCADE;
DROP TABLE IF EXISTS public.trade_shipments CASCADE;
DROP TABLE IF EXISTS public.trade_clients CASCADE;
DROP TABLE IF EXISTS public.digital_deliverables CASCADE;
DROP TABLE IF EXISTS public.digital_invoices CASCADE;
DROP TABLE IF EXISTS public.digital_tasks CASCADE;
DROP TABLE IF EXISTS public.digital_projects CASCADE;
DROP TABLE IF EXISTS public.digital_clients CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.pre_departure_checklists CASCADE;
DROP TABLE IF EXISTS public.visa_applications CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.student_documents CASCADE;
DROP TABLE IF EXISTS public.final_acceptance CASCADE;
DROP TABLE IF EXISTS public.offer_letters CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: USERS & AUTH SYNCHRONIZATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (
    role IN (
      'superadmin', 'super_admin', 'central',
      'admin', 'education_admin', 'education',
      'trade', 'trade_admin', 'global_trade',
      'rimi', 'rimi_admin', 'rimi_frozen',
      'digital', 'digital_admin', 'ferex_digital',
      'student', 'staff', 'counselor'
    )
  ),
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  passport_no TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT 'India',
  department TEXT DEFAULT '',
  assigned_counselor TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]'::jsonb,
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Helper function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('superadmin', 'super_admin', 'central')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic trigger on auth.users creation
-- Direct Supabase auth defaults to superadmin; if metadata role provided, assigns that role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Extract role from metadata or default to 'superadmin' for direct auth
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'superadmin');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    'User'
  );

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    avatar_url,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    role = CASE WHEN public.users.role = 'superadmin' THEN public.users.role ELSE EXCLUDED.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: 1. FEREX EDUCATION CORE MODULES
-- ─────────────────────────────────────────────────────────────────────────────

-- Universities catalog
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  logo_url TEXT DEFAULT '',
  ranking INTEGER DEFAULT 100,
  rating NUMERIC(3, 2) DEFAULT 4.5,
  programs TEXT[] DEFAULT ARRAY['Computer Science', 'Business Management'],
  tuition_range TEXT DEFAULT '€3,500 - €5,000 / yr',
  intakes TEXT[] DEFAULT ARRAY['October 2026', 'February 2027'],
  university_fee TEXT DEFAULT '€3,500',
  vfs_fee TEXT DEFAULT '₹15,000',
  agency_fee TEXT DEFAULT '₹25,000',
  course_programs JSONB DEFAULT '[]'::jsonb,
  installments JSONB DEFAULT '[]'::jsonb,
  semesters JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT 'Student',
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  university_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  course TEXT NOT NULL,
  intake TEXT NOT NULL DEFAULT 'October 2026',
  tuition_fee TEXT DEFAULT '',
  course_fee TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
    status IN ('Submitted', 'Under Review', 'NAWA Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Enrolled', 'Rejected')
  ),
  notes TEXT DEFAULT '',
  offer_letter_url TEXT DEFAULT '',
  final_acceptance_url TEXT DEFAULT '',
  applied_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offer Letters
CREATE TABLE public.offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  offer_letter_url TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Issued',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Final Acceptance Letters
CREATE TABLE public.final_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  final_acceptance_url TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Documents (NAWA, Apostille, Transcripts, Passports)
CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '1.2 MB',
  doc_type TEXT NOT NULL DEFAULT 'Transcripts',
  document_type TEXT DEFAULT 'Transcripts',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
    status IN ('Submitted', 'Pending Verification', 'Verified', 'Approved', 'Rejected', 'Re-upload Requested')
  ),
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL DEFAULT 'Student',
  ref_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_type TEXT NOT NULL DEFAULT 'Installment Fee',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Pending Verification', 'Paid', 'Verified', 'Partial', 'Rejected', 'Refunded', 'Cancelled', 'Overdue')
  ),
  payment_method TEXT DEFAULT 'UPI / Bank Transfer',
  utr_number TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reviewer_notes TEXT DEFAULT '',
  reminder_sent_at TIMESTAMPTZ,
  refund_amount NUMERIC(12, 2) DEFAULT 0,
  refund_reason TEXT DEFAULT '',
  credit_note_no TEXT DEFAULT '',
  partial_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Paid',
  file_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  invoice_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VFS Visa Applications
CREATE TABLE public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vfs_reference_no TEXT NOT NULL,
  appointment_date DATE,
  biometric_status TEXT DEFAULT 'Pending' CHECK (biometric_status IN ('Pending', 'Completed', 'Exempted')),
  embassy_location TEXT DEFAULT 'VFS New Delhi',
  tracking_status TEXT DEFAULT 'Under Review' CHECK (
    tracking_status IN ('Appointment Booked', 'Documents Submitted', 'Under Review', 'Embassy Verification', 'Approved & Stamped', 'Rejected')
  ),
  passport_status TEXT DEFAULT 'With Embassy',
  visa_issued_date DATE,
  visa_expiry_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-Departure & Post-Travel Checklists
CREATE TABLE public.pre_departure_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'Travel Documents',
  item_title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Admissions',
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'student',
  message TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'urgent')),
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings & Consultations
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  meet_link TEXT DEFAULT 'https://meet.google.com/fer-ex-edu',
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime Chat
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count_student INTEGER DEFAULT 0,
  unread_count_counselor INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL DEFAULT 'student',
  message TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: 2. FEREX DIGITAL SOLUTIONS AGENCY ERP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.digital_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  industry TEXT DEFAULT 'Software & AI',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Lead', 'Archived', 'On Hold')),
  website TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'Web Application' CHECK (
    service_type IN ('Web Application', 'Mobile App', 'AI & Cloud Infrastructure', 'Brand Identity', 'SEO & Growth')
  ),
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (
    status IN ('Planning', 'In Progress', 'Testing & Review', 'Completed', 'On Hold')
  ),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  pm_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deliverables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'In Review', 'Done')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date DATE,
  estimated_hours NUMERIC(5, 2) DEFAULT 8.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  paid_at TIMESTAMPTZ,
  line_items JSONB DEFAULT '[]'::jsonb,
  pdf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Rejected')),
  reviewer_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: 3. FEREX GLOBAL TRADE ERP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.trade_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT NOT NULL,
  city TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  payment_terms TEXT DEFAULT 'LC 60 Days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  tracking_no TEXT NOT NULL UNIQUE,
  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  vessel_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Customs Clearance', 'Loaded on Board', 'In Transit', 'Customs Destination', 'Delivered', 'On Hold')
  ),
  etd DATE NOT NULL DEFAULT CURRENT_DATE,
  eta DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  cargo_description TEXT NOT NULL,
  total_weight_kg NUMERIC(10, 2) DEFAULT 0,
  incoterms TEXT NOT NULL DEFAULT 'CIF' CHECK (incoterms IN ('CIF', 'FOB', 'EXW', 'DDP', 'CFR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN ('Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin', 'Phytosanitary Cert', 'Customs Clearance')
  ),
  document_no TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Submitted to Customs', 'Rejected')),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'INR', 'GBP')),
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'LC Confirmed', 'Paid', 'Overdue')),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  payment_method TEXT DEFAULT 'Letter of Credit (LC)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: 4. RIMI FOODS & DISTRIBUTION ERP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.rimi_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Distributor' CHECK (type IN ('Distributor', 'Wholesaler', 'Retail Chain', 'Supermarket')),
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  territory TEXT NOT NULL,
  address TEXT DEFAULT '',
  credit_limit NUMERIC(12, 2) DEFAULT 500000,
  current_balance NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Credit Block')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables', 'Processed Food', 'Dairy')),
  unit TEXT NOT NULL DEFAULT 'KG' CHECK (unit IN ('KG', 'Box', 'Pallet', 'Pack', 'Tonne')),
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  storage_temp TEXT DEFAULT '-18°C',
  min_stock_alert INTEGER DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  mfg_date DATE NOT NULL DEFAULT (CURRENT_DATE - INTERVAL '10 days'),
  expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '180 days'),
  warehouse_location TEXT NOT NULL DEFAULT 'Central Cold Storage #1',
  cold_room_no TEXT DEFAULT 'Room-A (-20°C)',
  status TEXT NOT NULL DEFAULT 'Good' CHECK (status IN ('Good', 'Near Expiry', 'Expired', 'Quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.rimi_distributors(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL UNIQUE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Processing', 'Dispatched', 'Delivered & Paid', 'Cancelled')
  ),
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid', 'Credit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  batch_id UUID REFERENCES public.rimi_inventory(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  vehicle_no TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT DEFAULT '',
  route_name TEXT NOT NULL,
  dispatch_time TIMESTAMPTZ DEFAULT NOW(),
  delivery_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'In Transit' CHECK (status IN ('Dispatched', 'In Transit', 'Delivered', 'Returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.rimi_distributors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.rimi_sales_orders(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Bank Transfer', 'Cheque', 'Cash', 'UPI')),
  ref_no TEXT DEFAULT '',
  collected_by TEXT DEFAULT 'Accounts',
  status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Pending Clearance', 'Received', 'Bounced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: CENTRAL SUPER ADMIN AUDIT LOGS & ENTERPRISE OVERVIEW
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.central_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Central Overview Analytics View
CREATE OR REPLACE VIEW public.central_enterprise_overview AS
SELECT
  (SELECT COUNT(*) FROM public.users WHERE role = 'student') AS education_students_total,
  (SELECT COUNT(*) FROM public.applications) AS education_applications_total,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status IN ('Paid', 'Verified')) AS education_revenue_inr,
  (SELECT COUNT(*) FROM public.digital_clients WHERE status = 'Active') AS digital_active_clients,
  (SELECT COUNT(*) FROM public.digital_projects WHERE status = 'In Progress') AS digital_running_projects,
  (SELECT COALESCE(SUM(total_amount), 0) FROM public.digital_invoices WHERE status = 'Paid') AS digital_revenue_inr,
  (SELECT COUNT(*) FROM public.trade_shipments WHERE status = 'In Transit') AS trade_active_shipments,
  (SELECT COALESCE(SUM(amount), 0) FROM public.trade_invoices WHERE payment_status = 'Paid') AS trade_revenue_eur,
  (SELECT COUNT(*) FROM public.rimi_sales_orders WHERE status != 'Cancelled') AS rimi_total_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM public.rimi_sales_orders WHERE status = 'Delivered & Paid') AS rimi_revenue_inr,
  (SELECT COUNT(*) FROM public.users WHERE role NOT IN ('student')) AS staff_count_total;

CREATE OR REPLACE FUNCTION public.get_central_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT row_to_json(ceo)::jsonb INTO result FROM public.central_enterprise_overview ceo;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_departure_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Users policies:
CREATE POLICY "superadmin_all_users" ON public.users FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin'))
);

CREATE POLICY "users_own_profile" ON public.users FOR SELECT TO authenticated USING (
  id = auth.uid()
);

CREATE POLICY "users_update_own_profile" ON public.users FOR UPDATE TO authenticated USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "users_insert_service_or_self" ON public.users FOR INSERT TO authenticated WITH CHECK (
  id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central'))
);

-- 2. Universities: Read by all authenticated / anon; Managed by Super Admin & Education Admin
CREATE POLICY "universities_read_all" ON public.universities FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "universities_manage_admin" ON public.universities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin'))
);

-- 3. Applications: Student manages own; Super Admin & Education Admin manage all
CREATE POLICY "applications_admin_all" ON public.applications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor'))
);
CREATE POLICY "applications_student_select" ON public.applications FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "applications_student_insert" ON public.applications FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- 4. Offer & Acceptance Letters:
CREATE POLICY "letters_admin_all" ON public.offer_letters FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "letters_student_select" ON public.offer_letters FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "final_acceptance_admin_all" ON public.final_acceptance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "final_acceptance_student_select" ON public.final_acceptance FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 5. Student Documents:
CREATE POLICY "documents_admin_all" ON public.student_documents FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "documents_student_access" ON public.student_documents FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 6. Payments & Invoices:
CREATE POLICY "payments_admin_all" ON public.payments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin'))
);
CREATE POLICY "payments_student_access" ON public.payments FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin'))
);
CREATE POLICY "invoices_student_access" ON public.invoices FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 7. Visa Applications & Checklists:
CREATE POLICY "visa_admin_all" ON public.visa_applications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "visa_student_access" ON public.visa_applications FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "checklists_admin_all" ON public.pre_departure_checklists FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "checklists_student_access" ON public.pre_departure_checklists FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 8. Support Tickets & Messages:
CREATE POLICY "tickets_admin_all" ON public.support_tickets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff'))
);
CREATE POLICY "tickets_student_access" ON public.support_tickets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ticket_msgs_all" ON public.ticket_messages FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')))
  )
);

-- 9. Notifications, Meetings, Chats:
CREATE POLICY "notifications_user_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "meetings_user_own" ON public.meetings FOR ALL TO authenticated USING (
  host_id = auth.uid() OR participant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central'))
);

CREATE POLICY "chat_conv_access" ON public.chat_conversations FOR ALL TO authenticated USING (
  student_id = auth.uid() OR counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'staff'))
);

CREATE POLICY "chat_msg_access" ON public.chat_messages FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.student_id = auth.uid() OR c.counselor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'admin', 'staff')))
  )
);

-- 10. DIGITAL SOLUTIONS AGENCY POLICIES:
CREATE POLICY "digital_clients_all" ON public.digital_clients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital'))
);
CREATE POLICY "digital_projects_all" ON public.digital_projects FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital'))
);
CREATE POLICY "digital_tasks_all" ON public.digital_tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital'))
);
CREATE POLICY "digital_invoices_all" ON public.digital_invoices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital'))
);
CREATE POLICY "digital_deliverables_all" ON public.digital_deliverables FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital'))
);

-- 11. GLOBAL TRADE ERP POLICIES:
CREATE POLICY "trade_clients_all" ON public.trade_clients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade'))
);
CREATE POLICY "trade_shipments_all" ON public.trade_shipments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade'))
);
CREATE POLICY "trade_documents_all" ON public.trade_documents FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade'))
);
CREATE POLICY "trade_invoices_all" ON public.trade_invoices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade'))
);

-- 12. RIMI DISTRIBUTION ERP POLICIES:
CREATE POLICY "rimi_distributors_all" ON public.rimi_distributors FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_products_all" ON public.rimi_products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_inventory_all" ON public.rimi_inventory FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_orders_all" ON public.rimi_sales_orders FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_order_items_all" ON public.rimi_order_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_deliveries_all" ON public.rimi_deliveries FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);
CREATE POLICY "rimi_payments_all" ON public.rimi_payments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen'))
);

-- 13. AUDIT LOGS:
CREATE POLICY "audit_logs_superadmin" ON public.central_audit_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superadmin', 'super_admin', 'central'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: SEED INITIAL BASELINE DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed Universities
INSERT INTO public.universities (name, country, city, ranking, rating, programs, tuition_range) VALUES
('University of Warsaw', 'Poland', 'Warsaw', 1, 4.9, ARRAY['Computer Science', 'Data Science', 'International Business', 'Medicine'], '€3,500 - €5,200 / yr'),
('Warsaw University of Technology', 'Poland', 'Warsaw', 2, 4.8, ARRAY['Robotics', 'Civil Engineering', 'Software Systems', 'Architecture'], '€3,200 - €4,800 / yr'),
('Jagiellonian University', 'Poland', 'Krakow', 3, 4.9, ARRAY['Biotechnology', 'Law & Governance', 'European Studies'], '€3,800 - €5,500 / yr'),
('Wroclaw University of Science and Technology', 'Poland', 'Wroclaw', 4, 4.7, ARRAY['AI & Automation', 'Mechanical Engineering', 'Cybersecurity'], '€3,000 - €4,500 / yr'),
('Poznan University of Economics and Business', 'Poland', 'Poznan', 5, 4.6, ARRAY['Finance & Accounting', 'Global Supply Chain', 'Digital Marketing'], '€2,800 - €4,200 / yr'),
('Technical University of Munich (TUM)', 'Germany', 'Munich', 10, 4.9, ARRAY['Informatics', 'Aerospace Engineering', 'Management'], '€0 - €1,500 / semester'),
('University of Amsterdam', 'Netherlands', 'Amsterdam', 18, 4.8, ARRAY['Economics', 'Artificial Intelligence', 'Media Studies'], '€9,000 - €14,000 / yr')
ON CONFLICT DO NOTHING;

-- Seed Rimi Products
INSERT INTO public.rimi_products (sku, name, category, unit, unit_price, storage_temp, min_stock_alert) VALUES
('RIMI-SEA-001', 'Black Tiger Jumbo Prawns', 'Frozen Seafood', 'KG', 850.00, '-22°C', 200),
('RIMI-SEA-002', 'Atlantic Salmon Fillet 500g', 'Frozen Seafood', 'Pack', 620.00, '-18°C', 150),
('RIMI-MT-101', 'Premium Frozen Boneless Chicken Breast', 'Frozen Meat & Poultry', 'Box', 2800.00, '-18°C', 50),
('RIMI-VEG-201', 'IQF Sweet Corn Kernel 1kg', 'Frozen Vegetables', 'Pack', 140.00, '-18°C', 500),
('RIMI-VEG-202', 'IQF Green Peas Grade-A 1kg', 'Frozen Vegetables', 'Pack', 160.00, '-18°C', 400),
('RIMI-PRC-301', 'Crispy Frozen French Fries 2.5kg', 'Processed Food', 'Pack', 450.00, '-18°C', 300)
ON CONFLICT DO NOTHING;

-- Seed Digital Sample Clients & Projects
INSERT INTO public.digital_clients (company_name, contact_person, email, phone, industry, status) VALUES
('Nexis Cloud Corp', 'Robert Vance', 'robert@nexiscloud.io', '+1 415 892 0122', 'Software & AI', 'Active'),
('OmniRetail Global', 'Elena Rostova', 'elena@omniretail.de', '+49 30 9182 3901', 'E-Commerce', 'Active'),
('BioHealth Logistics', 'Siddharth Nair', 'siddharth@biohealth.in', '+91 98450 11223', 'Healthcare & FMCG', 'Active')
ON CONFLICT DO NOTHING;

-- Seed Trade Sample Clients
INSERT INTO public.trade_clients (company_name, contact_person, email, phone, country, city, payment_terms) VALUES
('Rotterdam Agro Trade BV', 'Jan de Boer', 'jan@rotterdam-agro.nl', '+31 10 789 2311', 'Netherlands', 'Rotterdam', 'LC at Sight'),
('Hamburg Global Imports GmbH', 'Klaus Weber', 'klaus@hamburg-imports.de', '+49 40 5512 8900', 'Germany', 'Hamburg', 'LC 60 Days'),
('Nordic Seafood Distributors AS', 'Lars Eriksen', 'lars@nordicseafood.no', '+47 22 890 123', 'Norway', 'Oslo', 'TT 30 Days')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 10: STORAGE BUCKET POLICIES (AVATARS, DOCUMENTS, INVOICES, RECEIPTS)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', true),
  ('invoices', 'invoices', true),
  ('receipts', 'receipts', true),
  ('trade_docs', 'trade_docs', true),
  ('digital_assets', 'digital_assets', true),
  ('rimi_docs', 'rimi_docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies allowing authenticated uploads and public reads
DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
CREATE POLICY "Public Storage Access" ON storage.objects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
CREATE POLICY "Authenticated Updates" ON storage.objects FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;
CREATE POLICY "Authenticated Deletes" ON storage.objects FOR DELETE TO authenticated USING (true);
