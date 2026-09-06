-- Migration: 20260906000002_subsidiary_and_storage_schema_update.sql
-- Description: Synchronizes all Rimi cold-chain fleet/warehouse, Digital agency meetings/assets, Trade bonded inventory/losses, and Storage bucket policies to remote Supabase.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RIMI DISTRIBUTION EXTENDED TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rimi_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT DEFAULT '',
  cold_room_temp_celsius NUMERIC(5, 2) NOT NULL DEFAULT -22.00,
  total_capacity_pallets INTEGER NOT NULL DEFAULT 1000,
  utilized_pallets INTEGER NOT NULL DEFAULT 0,
  manager_name TEXT DEFAULT 'Hub Lead',
  manager_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.rimi_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  warehouse_id UUID REFERENCES public.rimi_warehouses(id) ON DELETE SET NULL,
  warehouse_name TEXT DEFAULT 'Central Cold Hub (-22°C)',
  quantity_units INTEGER NOT NULL DEFAULT 0,
  production_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  quality_grade TEXT NOT NULL DEFAULT 'Grade A Export',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Near Expiry Alert', 'Quarantined', 'Expired', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT DEFAULT '',
  capacity_tonnes NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
  current_temp_celsius NUMERIC(5, 2) NOT NULL DEFAULT -20.00,
  status TEXT NOT NULL DEFAULT 'Stationed' CHECK (status IN ('Stationed', 'On Route', 'Loading', 'Maintenance', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  origin_warehouse TEXT NOT NULL,
  destination_region TEXT NOT NULL,
  assigned_vehicle TEXT DEFAULT '',
  estimated_transit_hours INTEGER DEFAULT 4,
  stops JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Scheduled', 'Completed', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'customer',
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for Rimi extended
ALTER TABLE public.rimi_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "rimi_warehouses_all" ON public.rimi_warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rimi_batches_all" ON public.rimi_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rimi_vehicles_all" ON public.rimi_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rimi_routes_all" ON public.rimi_delivery_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rimi_messages_all" ON public.rimi_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rimi_notif_all" ON public.rimi_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DIGITAL SOLUTIONS EXTENDED TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digital_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Scheduled',
  agenda TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'client',
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Domain / SSL',
  asset_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Renewing', 'Expired', 'Archived')),
  expiry_date DATE,
  cost NUMERIC(12, 2) DEFAULT 0.00,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digital_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "digital_meetings_all" ON public.digital_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "digital_messages_all" ON public.digital_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "digital_notif_all" ON public.digital_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "digital_assets_all" ON public.digital_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GLOBAL TRADE EXTENDED TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trade_bonded_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  commodity TEXT NOT NULL,
  category TEXT DEFAULT 'General Cargo',
  port_location TEXT NOT NULL DEFAULT 'Port of Gdansk, Poland',
  warehouse_bay TEXT DEFAULT 'Bay 01-East',
  in_stock_metric_tons NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  reserved_metric_tons NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  available_metric_tons NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  unit_value_inr NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_valuation_inr NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  customs_bond_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Bond',
  last_inspected_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_cargo_losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no TEXT NOT NULL,
  container_no TEXT DEFAULT '',
  loss_type TEXT NOT NULL DEFAULT 'Port Demurrage Penalty',
  port_location TEXT NOT NULL DEFAULT 'Port of Rotterdam',
  loss_amount_inr NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  shrinkage_metric_tons NUMERIC(14, 2),
  carrier_responsible TEXT DEFAULT '',
  insurance_claim_status TEXT NOT NULL DEFAULT 'Not Filed',
  incident_date DATE DEFAULT CURRENT_DATE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL DEFAULT '1',
  contact_name TEXT NOT NULL,
  contact_role TEXT DEFAULT 'Customs Officer',
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_self BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Logistics',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trade_bonded_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_cargo_losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "trade_bonded_all" ON public.trade_bonded_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_loss_all" ON public.trade_cargo_losses FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_msg_all" ON public.trade_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "trade_notif_all" ON public.trade_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKETS & PUBLIC/AUTH POLICIES
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

DO $$ BEGIN
  CREATE POLICY "Public Storage Access" ON storage.objects FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT TO public WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated Updates" ON storage.objects FOR UPDATE TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated Deletes" ON storage.objects FOR DELETE TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
