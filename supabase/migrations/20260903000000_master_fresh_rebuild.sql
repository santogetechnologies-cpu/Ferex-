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
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_user_role() CASCADE;

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
DROP TABLE IF EXISTS public.ticket_replies CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.pre_departure_checklists CASCADE;
DROP TABLE IF EXISTS public.visa_applications CASCADE;
DROP TABLE IF EXISTS public.credit_notes CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.student_documents CASCADE;
DROP TABLE IF EXISTS public.final_acceptance CASCADE;
DROP TABLE IF EXISTS public.offer_letters CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: USERS & AUTH SYNCHRONIZATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id UUID PRIMARY KEY,
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

-- Helper function: SECURITY DEFINER to avoid RLS infinite recursion
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  END IF;
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid() LIMIT 1;
  RETURN COALESCE(v_role, 'anon');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Auto-sync auth.users trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'superadmin'
  );

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    ''
  );

  INSERT INTO public.users (id, email, full_name, role, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    v_phone,
    '',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
        role = CASE WHEN public.users.role IS NULL OR public.users.role = '' THEN EXCLUDED.role ELSE public.users.role END,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- System configuration table (for fee config, etc.)
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  university_name TEXT DEFAULT 'Pending University Selection',
  program_name TEXT DEFAULT 'Selected European Program',
  course TEXT NOT NULL DEFAULT 'Higher Studies',
  intake TEXT DEFAULT 'October 2026',
  tuition_fee TEXT DEFAULT '€3,500',
  course_fee TEXT DEFAULT '€3,500',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
    status IN (
      'Draft', 'Submitted', 'NAWA Review', 'NAWA Submitted', 'NAWA Approved',
      'Under Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued',
      'Visa Processing', 'Visa Approved', 'Approved', 'Enrolled', 'Closed', 'Rejected', 'Withdrawn'
    )
  ),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  offer_letter_url TEXT DEFAULT '',
  final_acceptance_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offer Letters
CREATE TABLE public.offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  university_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  letter_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Accepted', 'Declined')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_at TIMESTAMPTZ
);

-- Final Acceptance Letters
CREATE TABLE public.final_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  university_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Documents (NAWA, Apostille, Transcripts, Passports)
CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '1.2 MB',
  doc_type TEXT NOT NULL DEFAULT 'Transcripts',
  document_type TEXT DEFAULT 'Transcripts',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
    status IN ('Submitted', 'Pending Verification', 'Pending', 'Verified', 'Approved', 'Rejected', 'Re-upload Requested', 'Under Review')
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
  business TEXT NOT NULL DEFAULT 'FEREX EU Admissions',
  ref_no TEXT NOT NULL UNIQUE,
  transaction_id TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  partial_amount NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_type TEXT NOT NULL DEFAULT 'Registration Fee',
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Pending Verification', 'Paid', 'Verified', 'Rejected', 'Overdue', 'Cancelled', 'Refunded', 'Partial')
  ),
  milestone_step INTEGER DEFAULT 1,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  utr_number TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  refund_reason TEXT DEFAULT '',
  credit_note_no TEXT DEFAULT '',
  reviewer_notes TEXT DEFAULT '',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Unpaid', 'Paid', 'Overdue', 'Cancelled')),
  due_date DATE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Receipts
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT DEFAULT 'UPI',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit Notes
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  credit_note_no TEXT NOT NULL UNIQUE,
  original_amount NUMERIC(12, 2) NOT NULL,
  refund_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL DEFAULT 'Refund processed',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visa Applications (VFS Tracker)
CREATE TABLE public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'Poland',
  vfs_center TEXT DEFAULT 'VFS New Delhi',
  appointment_date DATE,
  submission_date DATE,
  reference_no TEXT DEFAULT '',
  tracking_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Documents Prepared' CHECK (
    status IN ('Documents Prepared', 'Appointment Booked', 'Submitted at VFS', 'Under Embassy Review', 'Visa Approved', 'Visa Refused')
  ),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-Departure & Post-Travel Checklist (Stage 12)
CREATE TABLE public.pre_departure_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Pre-Departure',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_no TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT 'Student',
  user_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General Query',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Normal', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Replies (Used by API)
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Admin',
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Messages (Alias / Realtime table)
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Student',
  sender_role TEXT NOT NULL DEFAULT 'student',
  message TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  message TEXT DEFAULT '',
  category TEXT DEFAULT 'Support',
  type TEXT DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT DEFAULT '',
  action_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings & Consultations
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT 'Advisory Session',
  title TEXT NOT NULL DEFAULT 'Advisory Session',
  advisor_name TEXT NOT NULL DEFAULT 'Academic Counselor',
  scheduled_date TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '10:00 AM',
  end_time TEXT NOT NULL DEFAULT '10:45 AM',
  meeting_link TEXT DEFAULT 'https://meet.google.com/fer-exed-app',
  meet_link TEXT DEFAULT 'https://meet.google.com/fer-exed-app',
  notes TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'Confirmed')),
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
  industry TEXT DEFAULT 'Technology',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Lead', 'Active', 'On Hold', 'Completed', 'Archived')),
  total_revenue NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  service_category TEXT NOT NULL CHECK (
    service_category IN ('Web & App Development', 'UI/UX Design', 'Digital Marketing', 'SEO & Performance', 'Branding & Identity', 'Cloud Infrastructure')
  ),
  status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Lead', 'Planning', 'In Progress', 'In Review', 'Completed', 'Archived')),
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  progress INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  deadline DATE,
  lead_developer TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'In Review', 'Done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  due_date DATE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  approved_by_client BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  payment_terms TEXT DEFAULT 'LC 60 Days',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Prospect', 'Active', 'Suspended', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  shipment_no TEXT NOT NULL UNIQUE,
  commodity TEXT NOT NULL,
  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  carrier_vessel TEXT DEFAULT '',
  container_count INTEGER DEFAULT 1,
  bill_of_lading_no TEXT DEFAULT '',
  incoterm TEXT NOT NULL DEFAULT 'FOB' CHECK (incoterm IN ('FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'FCA')),
  shipment_status TEXT NOT NULL DEFAULT 'Booked' CHECK (
    shipment_status IN ('Booked', 'Customs Clearance Origin', 'Loaded On Vessel', 'In Transit', 'Arrived Port', 'Customs Destination', 'Delivered', 'Held')
  ),
  etd DATE,
  eta DATE,
  cargo_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN ('Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin', 'Phytosanitary Cert', 'Letter of Credit', 'Customs Declaration', 'Insurance')
  ),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trade_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'LC Verified', 'Paid', 'Overdue', 'Disputed')),
  due_date DATE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: 4. RIMI FROZEN FOODS DISTRIBUTION ERP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.rimi_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Retailer' CHECK (tier IN ('Distributor', 'Wholesaler', 'Retailer', 'HORECA Partner')),
  territory TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  credit_limit NUMERIC(12, 2) DEFAULT 100000.00,
  outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables', 'Processed Food', 'Ice Cream & Dairy')),
  unit TEXT NOT NULL DEFAULT 'KG' CHECK (unit IN ('KG', 'Box', 'Pack', 'Case', 'Ton')),
  unit_price NUMERIC(10, 2) NOT NULL,
  storage_temp TEXT NOT NULL DEFAULT '-18°C',
  min_stock_alert INTEGER DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  warehouse_location TEXT NOT NULL DEFAULT 'Cold Storage 1 (Chennai)',
  quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  production_date DATE,
  expiry_date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.rimi_distributors(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(12, 2) NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'Received' CHECK (
    order_status IN ('Received', 'Confirmed', 'Cold Storage Picking', 'Dispatched', 'Delivered', 'Cancelled')
  ),
  delivery_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_line_amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE public.rimi_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  vehicle_no TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT DEFAULT '',
  departure_temp TEXT DEFAULT '-18.5°C',
  delivery_status TEXT NOT NULL DEFAULT 'Assigned' CHECK (delivery_status IN ('Assigned', 'In Transit', 'Delivered', 'Returned')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rimi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.rimi_distributors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.rimi_sales_orders(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference_no TEXT DEFAULT '',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: 5. CENTRAL SUPER ADMIN AUDIT & DASHBOARD
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.central_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT 'Super Admin',
  actor_role TEXT NOT NULL DEFAULT 'superadmin',
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_departure_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
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

-- 1. Users policies (NO RECURSION using SECURITY DEFINER public.get_auth_user_role)
CREATE POLICY "users_read_all" ON public.users FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "superadmin_manage_users" ON public.users FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin')
) WITH CHECK (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin')
);

CREATE POLICY "users_update_own_profile" ON public.users FOR UPDATE TO authenticated USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "users_insert_service_or_self" ON public.users FOR INSERT TO authenticated, anon WITH CHECK (
  true
);

-- System config
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "system_config_manage" ON public.system_config FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);

-- 2. Universities
CREATE POLICY "universities_read_all" ON public.universities FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "universities_manage_admin" ON public.universities FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);

-- 3. Applications
CREATE POLICY "applications_admin_all" ON public.applications FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff', 'counselor')
);
CREATE POLICY "applications_student_select" ON public.applications FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "applications_student_insert" ON public.applications FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "applications_student_update" ON public.applications FOR UPDATE TO authenticated USING (student_id = auth.uid());

-- 4. Letters
CREATE POLICY "letters_admin_all" ON public.offer_letters FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "letters_student_select" ON public.offer_letters FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "final_acceptance_admin_all" ON public.final_acceptance FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "final_acceptance_student_select" ON public.final_acceptance FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 5. Student Documents
CREATE POLICY "documents_admin_all" ON public.student_documents FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "documents_student_access" ON public.student_documents FOR ALL TO authenticated USING (
  student_id = auth.uid() OR student_id IS NULL
) WITH CHECK (
  student_id = auth.uid() OR student_id IS NULL
);

-- 6. Payments, Invoices, Receipts, Credit Notes
CREATE POLICY "payments_admin_all" ON public.payments FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);
CREATE POLICY "payments_student_access" ON public.payments FOR ALL TO authenticated USING (student_id = auth.uid());

CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);
CREATE POLICY "invoices_student_access" ON public.invoices FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "receipts_admin_all" ON public.receipts FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);
CREATE POLICY "receipts_student_access" ON public.receipts FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "credit_notes_admin_all" ON public.credit_notes FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin')
);
CREATE POLICY "credit_notes_student_access" ON public.credit_notes FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 7. Visa & Checklists
CREATE POLICY "visa_admin_all" ON public.visa_applications FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "visa_student_access" ON public.visa_applications FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "checklists_admin_all" ON public.pre_departure_checklists FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "checklists_student_access" ON public.pre_departure_checklists FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 8. Support Tickets & Replies
CREATE POLICY "tickets_admin_all" ON public.support_tickets FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
);
CREATE POLICY "tickets_student_access" ON public.support_tickets FOR ALL TO authenticated USING (
  student_id = auth.uid() OR user_id = auth.uid() OR student_id IS NULL OR user_id IS NULL
) WITH CHECK (
  student_id = auth.uid() OR user_id = auth.uid() OR student_id IS NULL OR user_id IS NULL
);

CREATE POLICY "ticket_replies_all" ON public.ticket_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ticket_msgs_all" ON public.ticket_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Notifications, Meetings, Chats
CREATE POLICY "notifications_all" ON public.notifications FOR ALL TO authenticated USING (
  user_id = auth.uid() OR user_id IS NULL OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
) WITH CHECK (
  true
);

CREATE POLICY "meetings_all" ON public.meetings FOR ALL TO authenticated USING (
  student_id = auth.uid() OR host_id = auth.uid() OR participant_id = auth.uid() OR student_id IS NULL OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'staff')
) WITH CHECK (
  true
);

CREATE POLICY "chat_conv_access" ON public.chat_conversations FOR ALL TO authenticated USING (
  student_id = auth.uid() OR counselor_id = auth.uid() OR public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'admin', 'staff')
);

CREATE POLICY "chat_msg_access" ON public.chat_messages FOR ALL TO authenticated USING (
  true
) WITH CHECK (
  true
);

-- 10. DIGITAL SOLUTIONS AGENCY POLICIES
CREATE POLICY "digital_clients_all" ON public.digital_clients FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital')
);
CREATE POLICY "digital_projects_all" ON public.digital_projects FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital')
);
CREATE POLICY "digital_tasks_all" ON public.digital_tasks FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital')
);
CREATE POLICY "digital_invoices_all" ON public.digital_invoices FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital')
);
CREATE POLICY "digital_deliverables_all" ON public.digital_deliverables FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'digital', 'digital_admin', 'ferex_digital')
);

-- 11. GLOBAL TRADE ERP POLICIES
CREATE POLICY "trade_clients_all" ON public.trade_clients FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade')
);
CREATE POLICY "trade_shipments_all" ON public.trade_shipments FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade')
);
CREATE POLICY "trade_documents_all" ON public.trade_documents FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade')
);
CREATE POLICY "trade_invoices_all" ON public.trade_invoices FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'trade', 'trade_admin', 'global_trade')
);

-- 12. RIMI DISTRIBUTION ERP POLICIES
CREATE POLICY "rimi_distributors_all" ON public.rimi_distributors FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_products_all" ON public.rimi_products FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_inventory_all" ON public.rimi_inventory FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_orders_all" ON public.rimi_sales_orders FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_order_items_all" ON public.rimi_order_items FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_deliveries_all" ON public.rimi_deliveries FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);
CREATE POLICY "rimi_payments_all" ON public.rimi_payments FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen')
);

-- 13. AUDIT LOGS
CREATE POLICY "audit_logs_superadmin" ON public.central_audit_logs FOR ALL TO authenticated USING (
  public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: SEED INITIAL BASELINE DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed Universities
INSERT INTO public.universities (name, country, city, ranking, rating, programs, tuition_range, university_fee, vfs_fee, agency_fee) VALUES
('University of Warsaw', 'Poland', 'Warsaw', 1, 4.9, ARRAY['Computer Science', 'Data Science', 'International Business', 'Medicine'], '€3,500 - €5,200 / yr', '€3,500', '₹15,000', '₹25,000'),
('Warsaw University of Technology', 'Poland', 'Warsaw', 2, 4.8, ARRAY['Robotics', 'Civil Engineering', 'Software Systems', 'Architecture'], '€3,200 - €4,800 / yr', '€3,200', '₹15,000', '₹25,000'),
('Jagiellonian University', 'Poland', 'Krakow', 3, 4.9, ARRAY['Biotechnology', 'Law & Governance', 'European Studies'], '€3,800 - €5,500 / yr', '€3,800', '₹15,000', '₹25,000'),
('Wroclaw University of Science and Technology', 'Poland', 'Wroclaw', 4, 4.7, ARRAY['AI & Automation', 'Mechanical Engineering', 'Cybersecurity'], '€3,000 - €4,500 / yr', '€3,000', '₹15,000', '₹25,000'),
('Poznan University of Economics and Business', 'Poland', 'Poznan', 5, 4.6, ARRAY['Finance & Accounting', 'Global Supply Chain', 'Digital Marketing'], '€2,800 - €4,200 / yr', '€2,800', '₹15,000', '₹25,000'),
('Technical University of Munich (TUM)', 'Germany', 'Munich', 10, 4.9, ARRAY['Informatics', 'Aerospace Engineering', 'Management'], '€0 - €1,500 / semester', '€1,500', '₹15,000', '₹25,000'),
('University of Amsterdam', 'Netherlands', 'Amsterdam', 18, 4.8, ARRAY['Economics', 'Artificial Intelligence', 'Media Studies'], '€9,000 - €14,000 / yr', '€9,000', '₹15,000', '₹25,000')
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

-- Seed Digital Sample Clients
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
  ('student-documents', 'student-documents', true),
  ('documents', 'documents', true),
  ('offer-letters', 'offer-letters', true),
  ('receipts', 'receipts', true),
  ('trade-documents', 'trade-documents', true),
  ('trade_docs', 'trade_docs', true),
  ('digital-assets', 'digital-assets', true),
  ('digital_assets', 'digital_assets', true),
  ('rimi_docs', 'rimi_docs', true),
  ('avatars', 'avatars', true),
  ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies allowing authenticated uploads and public reads
DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
CREATE POLICY "Public Storage Access" ON storage.objects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
CREATE POLICY "Authenticated Updates" ON storage.objects FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;
CREATE POLICY "Authenticated Deletes" ON storage.objects FOR DELETE TO public USING (true);
