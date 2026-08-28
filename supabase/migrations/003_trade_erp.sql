-- =============================================================================
-- Migration 003: Global Trade & Maritime Logistics ERP Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trade_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_no TEXT NOT NULL UNIQUE DEFAULT ('SHP-' || floor(random() * 9000 + 1000)::text),
  container_no TEXT NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'Maersk Line',
  origin_port TEXT NOT NULL DEFAULT 'Gdansk Port (Poland)',
  destination_port TEXT NOT NULL DEFAULT 'Rotterdam (Netherlands)',
  cargo_description TEXT NOT NULL,
  cargo_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 20000,
  transport_mode TEXT NOT NULL DEFAULT 'Maritime' CHECK (transport_mode IN ('Maritime', 'Air Cargo', 'Intermodal Road Rail', 'Ocean Reefer')),
  status TEXT NOT NULL DEFAULT 'In Transit' CHECK (status IN ('Booking Confirmed', 'Customs Cleared', 'Loaded on Vessel', 'In Transit', 'Arrived at Port', 'Discharged', 'Delivered')),
  eta DATE NOT NULL,
  etd DATE NOT NULL,
  vessel_name TEXT DEFAULT 'Maersk Mc-Kinney Moller',
  voyage_no TEXT DEFAULT 'V.2026-EU-08',
  customs_status TEXT DEFAULT 'Cleared & Duty Paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Germany',
  entity_type TEXT NOT NULL DEFAULT 'Buyer' CHECK (entity_type IN ('Buyer', 'Supplier', 'Freight Forwarder', 'Customs Broker', 'Port Authority')),
  active_contracts_count INTEGER DEFAULT 1,
  total_trade_volume NUMERIC(16, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Audit', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT ('INV-TRD-' || floor(random() * 90000 + 10000)::text),
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  seller_name TEXT NOT NULL DEFAULT 'FEREX Global Trade Division',
  incoterms TEXT NOT NULL DEFAULT 'FOB' CHECK (incoterms IN ('FOB', 'CIF', 'EXW', 'DDP', 'CFR', 'FCA')),
  amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Under LC Verification', 'Paid', 'Overdue')),
  payment_terms TEXT DEFAULT 'Letter of Credit (LC) at Sight',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '45 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_packing_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  packing_list_no TEXT NOT NULL UNIQUE DEFAULT ('PL-2026-' || floor(random() * 9000 + 1000)::text),
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  total_packages INTEGER NOT NULL DEFAULT 120,
  package_type TEXT NOT NULL DEFAULT 'Standard Euro Pallets',
  gross_weight_kg NUMERIC(10, 2) NOT NULL,
  net_weight_kg NUMERIC(10, 2) NOT NULL,
  volume_cbm NUMERIC(8, 2) NOT NULL DEFAULT 45.0,
  items_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_bills_of_lading (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bl_number TEXT NOT NULL UNIQUE,
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  shipper TEXT NOT NULL,
  consignee TEXT NOT NULL,
  notify_party TEXT NOT NULL,
  port_of_loading TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  vessel_name TEXT NOT NULL,
  freight_payable_at TEXT DEFAULT 'Destination Port',
  document_url TEXT DEFAULT '',
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_letters_of_credit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lc_number TEXT NOT NULL UNIQUE,
  issuing_bank TEXT NOT NULL,
  advising_bank TEXT NOT NULL,
  beneficiary TEXT NOT NULL DEFAULT 'FEREX Global Trade LLC',
  applicant TEXT NOT NULL,
  amount NUMERIC(16, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expiry_date DATE NOT NULL,
  latest_shipment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Draft', 'Issued', 'Confirmed', 'Documents Presented', 'Honor/Paid', 'Expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime publication for Global Trade
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.trade_shipments,
  public.trade_invoices,
  public.trade_crm_contacts,
  public.trade_letters_of_credit;
