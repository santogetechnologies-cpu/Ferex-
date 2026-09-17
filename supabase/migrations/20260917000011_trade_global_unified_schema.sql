-- ─────────────────────────────────────────────────────────────────────────────
-- FEREX GLOBAL TRADE & MARITIME COMMODITIES — UNIFIED RELATIONAL SCHEMA
-- Migration: 20260917000011_trade_global_unified_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Trade Clients & Overseas Partners Directory
CREATE TABLE IF NOT EXISTS public.trade_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT DEFAULT 'Poland',
  city TEXT DEFAULT '',
  category TEXT DEFAULT 'Buyer / Importer',
  vat_number TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '30% Advance Wire, 70% Balance against Shipping B/L copy',
  credit_limit NUMERIC(14, 2) DEFAULT 500000.00,
  portal_active BOOLEAN NOT NULL DEFAULT true,
  temp_password TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trade Orders & Shipments Lifecycle (7-Stage International Execution)
CREATE TABLE IF NOT EXISTS public.trade_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  po_number TEXT DEFAULT '',
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  client_country TEXT DEFAULT 'Poland',
  commodity TEXT NOT NULL,
  quantity_units TEXT DEFAULT '1,000 Metric Tons',
  incoterm TEXT NOT NULL DEFAULT 'CIF (Cost, Insurance and Freight)',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'INR', 'GBP', 'AED', 'PLN')),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  advance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  advance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  advance_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  advance_status TEXT NOT NULL DEFAULT 'Pending' CHECK (advance_status IN ('Pending', 'Paid')),
  balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  balance_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  balance_status TEXT NOT NULL DEFAULT 'Pending' CHECK (balance_status IN ('Pending', 'Paid')),
  payment_terms_desc TEXT DEFAULT '30% Advance Wire, 70% Balance against Shipping B/L copy',
  lc_reference TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Inquiry' CHECK (
    stage IN ('Inquiry', 'Quote Sent', 'Order Confirmed', 'Production/Sourcing', 'Shipped', 'Customs Clearance', 'Delivered')
  ),
  stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_staff_name TEXT DEFAULT 'Elena Rostova',
  assigned_staff_email TEXT DEFAULT 'elena.rostova@ferex.com',
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  carrier TEXT DEFAULT '',
  vessel_flight TEXT DEFAULT '',
  voyage_no TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  origin_port TEXT DEFAULT 'Port of Gdansk, Poland',
  destination_port TEXT DEFAULT 'Port of Nhava Sheva (JNPT), India',
  etd DATE,
  eta DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trade Documents Vault (7 Core International Compliance Dossiers)
CREATE TABLE IF NOT EXISTS public.trade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL,
  client_name TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN (
      'Proforma Invoice',
      'Commercial Invoice',
      'Packing List',
      'Bill of Lading / Airway Bill',
      'Certificate of Origin',
      'Letter of Credit',
      'Inspection Certificate'
    )
  ),
  doc_number TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  file_size TEXT DEFAULT '0 KB',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Submitted', 'Verified', 'Rejected')),
  rejection_reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT 'Staff Desk',
  verified_by TEXT DEFAULT '',
  verified_at TIMESTAMPTZ,
  sent_to_client BOOLEAN NOT NULL DEFAULT false,
  sent_to_client_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trade Operational Tasks & Logistics Assignments
CREATE TABLE IF NOT EXISTS public.trade_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Order Handling' CHECK (
    category IN ('Order Handling', 'Documentation', 'Logistics', 'Customs & Port', 'Finance')
  ),
  order_no TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  assigned_staff_name TEXT NOT NULL,
  assigned_staff_email TEXT NOT NULL,
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Trade Customer Support & Port Clearance Tickets
CREATE TABLE IF NOT EXISTS public.trade_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_contact TEXT DEFAULT '',
  order_no TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'Email' CHECK (channel IN ('Email', 'Phone Call', 'WhatsApp', 'In-Person')),
  subject TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_staff_name TEXT DEFAULT '',
  assigned_staff_email TEXT DEFAULT '',
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT DEFAULT '',
  logged_by TEXT DEFAULT 'Staff Desk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trade Financial Settlement & Payment Receipts
CREATE TABLE IF NOT EXISTS public.trade_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL,
  order_id UUID REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.trade_clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'Advance Payment',
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'Bank Wire / SWIFT',
  transaction_ref TEXT DEFAULT '',
  lc_reference TEXT DEFAULT '',
  receipt_no TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Trade Automated Notification & Email Log
CREATE TABLE IF NOT EXISTS public.trade_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  trigger_label TEXT NOT NULL,
  order_no TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_preview TEXT DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Sent' CHECK (status IN ('Sent', 'Delivered', 'Queued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.trade_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "trade_clients_authenticated" ON public.trade_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_orders_authenticated" ON public.trade_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_documents_authenticated" ON public.trade_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_tasks_authenticated" ON public.trade_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_tickets_authenticated" ON public.trade_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_payments_authenticated" ON public.trade_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_notifications_authenticated" ON public.trade_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME REPLICATION CONFIGURATION
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_clients;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_orders;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_documents;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_tasks;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_tickets;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_payments;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
