-- =============================================================================
-- Migration 004: Rimi Frozen Cold-Chain Distribution ERP Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rimi_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frozen Poultry', 'Seafood & Fish Fillets', 'Gourmet Ice Cream', 'Frozen Vegetables', 'Dairy & Mozzarella', 'Ready to Fry')),
  storage_temp_celsius NUMERIC(4, 1) NOT NULL DEFAULT -18.0,
  unit_of_measure TEXT NOT NULL DEFAULT 'Box (20kg)',
  unit_price NUMERIC(10, 2) NOT NULL,
  current_stock_units INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  cold_room_temp_celsius NUMERIC(4, 1) NOT NULL DEFAULT -22.0,
  total_capacity_pallets INTEGER NOT NULL DEFAULT 1000,
  utilized_pallets INTEGER NOT NULL DEFAULT 650,
  manager_name TEXT NOT NULL DEFAULT 'Hub Lead',
  manager_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.rimi_products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  warehouse_id UUID REFERENCES public.rimi_warehouses(id) ON DELETE SET NULL,
  warehouse_name TEXT DEFAULT 'Central Cold Hub',
  quantity_units INTEGER NOT NULL,
  production_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quality_grade TEXT NOT NULL DEFAULT 'Grade A Export',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Near Expiry', 'Quarantine', 'Expired', 'Depleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT NOT NULL UNIQUE DEFAULT ('CUST-' || floor(random() * 9000 + 1000)::text),
  business_name TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Distributor', 'Retail Chain', 'Wholesaler', 'Hotel/Restaurant/Catering (HoReCa)')),
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  credit_limit NUMERIC(12, 2) DEFAULT 500000,
  outstanding_balance NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Credit Blocked', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no TEXT NOT NULL UNIQUE DEFAULT ('SO-2026-' || floor(random() * 9000 + 1000)::text),
  customer_id UUID REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  items_summary TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New Order' CHECK (status IN ('New Order', 'In Packing', 'Dispatched', 'Out for Delivery', 'Delivered & Paid', 'Cancelled')),
  assigned_reefer_truck TEXT DEFAULT '',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_number TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL DEFAULT 'Reefer Truck (10 Ton)',
  current_temp_celsius NUMERIC(4, 1) NOT NULL DEFAULT -19.5,
  temp_compliance_status TEXT NOT NULL DEFAULT 'Optimal (-18°C compliant)',
  driver_name TEXT NOT NULL,
  driver_phone TEXT DEFAULT '',
  route_assigned TEXT DEFAULT 'Mumbai - Pune Expressway',
  gps_location TEXT DEFAULT 'Navi Mumbai Highway (In Transit)',
  status TEXT NOT NULL DEFAULT 'On Route' CHECK (status IN ('Available', 'Loading', 'On Route', 'Maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_no TEXT NOT NULL UNIQUE DEFAULT ('REC-COL-' || floor(random() * 90000 + 10000)::text),
  customer_id UUID REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Bank NEFT/RTGS' CHECK (payment_mode IN ('Bank NEFT/RTGS', 'Cheque', 'UPI / IMPS', 'Cash')),
  reference_no TEXT NOT NULL,
  collected_by TEXT DEFAULT 'Area Sales Officer',
  status TEXT NOT NULL DEFAULT 'Cleared' CHECK (status IN ('Pending Clearance', 'Cleared', 'Bounced')),
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime publication for Rimi Distribution
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.rimi_products,
  public.rimi_sales_orders,
  public.rimi_vehicles,
  public.rimi_collections,
  public.rimi_batches;
