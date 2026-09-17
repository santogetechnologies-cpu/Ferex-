-- ─────────────────────────────────────────────────────────────────────────────
-- FEREX RIMI FROZEN FOODS DISTRIBUTION — UNIFIED RELATIONAL SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Warehouses & Cold Storage Facilities
CREATE TABLE IF NOT EXISTS public.rimi_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT DEFAULT '',
  cold_room_temp_celsius NUMERIC(5, 2) NOT NULL DEFAULT -22.00,
  total_capacity_pallets INTEGER NOT NULL DEFAULT 1000,
  utilized_pallets INTEGER NOT NULL DEFAULT 0,
  manager_name TEXT DEFAULT 'Facility Lead',
  manager_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products Catalog
CREATE TABLE IF NOT EXISTS public.rimi_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables', 'Processed Food', 'Ice Cream & Dairy', 'Frozen Ready-to-Eat', 'Bakery & Pastry')),
  unit TEXT NOT NULL DEFAULT 'KG' CHECK (unit IN ('KG', 'Box', 'Pack', 'Case', 'Ton', 'Carton')),
  unit_price NUMERIC(10, 2) NOT NULL,
  storage_temp TEXT NOT NULL DEFAULT '-18°C',
  min_stock_alert INTEGER DEFAULT 50,
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Unified CRM Customers Database (Distributor, Retailer, Wholesaler)
CREATE TABLE IF NOT EXISTS public.rimi_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Distributor', 'Shop / Retailer', 'Wholesaler', 'HORECA Partner')),
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gst_no TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT 'Mumbai',
  district TEXT DEFAULT '',
  state TEXT DEFAULT 'Maharashtra',
  pincode TEXT DEFAULT '',
  territory TEXT DEFAULT 'West Zone',
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_staff_name TEXT DEFAULT '',
  assigned_staff_email TEXT DEFAULT '',
  credit_period_days INTEGER DEFAULT 30,
  credit_limit NUMERIC(14, 2) DEFAULT 100000.00,
  outstanding_amount NUMERIC(14, 2) DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'Current' CHECK (payment_status IN ('Current', 'Overdue', 'Advance', 'Blocked')),
  preferred_products TEXT[] DEFAULT '{}',
  pipeline_stage TEXT NOT NULL DEFAULT 'Lead' CHECK (pipeline_stage IN ('Lead', 'Contacted', 'Sample Sent', 'Negotiation', 'Active Account', 'Suspended')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Inactive')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Customer Activity Timeline (Notes, Calls, Visits, Complaints, Stage Changes, Orders, Payments)
CREATE TABLE IF NOT EXISTS public.rimi_customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.rimi_customers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('Note', 'Call Log', 'Visit Log', 'Complaint', 'Stage Change', 'Order Placed', 'Payment Received', 'Sample Sent', 'Status Update')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  performed_by TEXT DEFAULT 'Staff',
  performed_by_email TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  attachment_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Unified Inventory Batches (Merged Batch + Expiry System)
CREATE TABLE IF NOT EXISTS public.rimi_inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_category TEXT DEFAULT 'Frozen Seafood',
  mfg_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  initial_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  unit TEXT DEFAULT 'KG',
  warehouse_id UUID REFERENCES public.rimi_warehouses(id) ON DELETE SET NULL,
  warehouse_name TEXT DEFAULT 'Cold Storage 1 (Chennai)',
  storage_temp TEXT DEFAULT '-18°C',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Expired', 'Low Stock', 'Depleted', 'Quarantined')),
  certificate_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Stock Movements (Continuous Audit Trail)
CREATE TABLE IF NOT EXISTS public.rimi_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.rimi_inventory_batches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.rimi_products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('Initial Stock', 'Dispatch', 'Transfer', 'Adjustment', 'Damage / Waste', 'Return', 'Restock')),
  quantity_change NUMERIC(12, 2) NOT NULL,
  resulting_quantity NUMERIC(12, 2) NOT NULL,
  order_id UUID,
  reference_no TEXT DEFAULT '',
  warehouse_id UUID REFERENCES public.rimi_warehouses(id) ON DELETE SET NULL,
  performed_by TEXT DEFAULT 'Admin',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Sales Orders
CREATE TABLE IF NOT EXISTS public.rimi_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.rimi_customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_type TEXT DEFAULT 'Shop / Retailer',
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_staff_name TEXT DEFAULT '',
  total_amount NUMERIC(14, 2) NOT NULL,
  paid_amount NUMERIC(14, 2) DEFAULT 0.00,
  balance_amount NUMERIC(14, 2) DEFAULT 0.00,
  order_status TEXT NOT NULL DEFAULT 'Received' CHECK (
    order_status IN ('Received', 'Confirmed', 'Cold Storage Picking', 'Dispatched', 'Delivered', 'Cancelled')
  ),
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (
    payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Overdue')
  ),
  delivery_date DATE,
  delivery_address TEXT DEFAULT '',
  territory TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  challan_url TEXT DEFAULT '',
  invoice_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Sales Order Items
CREATE TABLE IF NOT EXISTS public.rimi_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.rimi_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  batch_id UUID REFERENCES public.rimi_inventory_batches(id) ON DELETE SET NULL,
  batch_no TEXT DEFAULT '',
  quantity NUMERIC(10, 2) NOT NULL,
  unit TEXT DEFAULT 'KG',
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL
);

-- 9. Payments & Collections
CREATE TABLE IF NOT EXISTS public.rimi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.rimi_customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  order_id UUID REFERENCES public.rimi_sales_orders(id) ON DELETE SET NULL,
  order_no TEXT DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer' CHECK (
    payment_method IN ('Bank Transfer', 'UPI', 'Cheque', 'Cash', 'RTGS/NEFT', 'Credit Card')
  ),
  reference_no TEXT DEFAULT '',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by_name TEXT DEFAULT '',
  collected_by_email TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Reefer Vehicles Fleet
CREATE TABLE IF NOT EXISTS public.rimi_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_no TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  capacity_metric_tons NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
  min_temp_celsius NUMERIC(5, 2) NOT NULL DEFAULT -25.00,
  current_temp_celsius NUMERIC(5, 2) NOT NULL DEFAULT -20.00,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  gps_tracking_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Route', 'Maintenance', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Delivery Routes
CREATE TABLE IF NOT EXISTS public.rimi_delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_code TEXT NOT NULL UNIQUE,
  route_name TEXT NOT NULL,
  region TEXT NOT NULL,
  origin_facility TEXT NOT NULL,
  destinations TEXT[] NOT NULL DEFAULT '{}',
  distance_km NUMERIC(7, 2) NOT NULL DEFAULT 50.00,
  estimated_transit_hours NUMERIC(4, 2) NOT NULL DEFAULT 3.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Deliveries Execution
CREATE TABLE IF NOT EXISTS public.rimi_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_no TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.rimi_sales_orders(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_address TEXT DEFAULT '',
  vehicle_id UUID REFERENCES public.rimi_vehicles(id) ON DELETE SET NULL,
  vehicle_no TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT DEFAULT '',
  departure_temp TEXT DEFAULT '-18.5°C',
  arrival_temp TEXT DEFAULT '-18.0°C',
  delivery_status TEXT NOT NULL DEFAULT 'Assigned' CHECK (
    delivery_status IN ('Assigned', 'Loading', 'In Transit', 'Delivered', 'Returned', 'Failed')
  ),
  dispatch_time TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  route_name TEXT DEFAULT '',
  challan_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Tasks & Assignments
CREATE TABLE IF NOT EXISTS public.rimi_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'Delivery' CHECK (
    task_type IN ('Sales Follow-up', 'Payment Collection', 'Quality Inspection', 'Delivery', 'Cold Storage Maintenance', 'Stock Audit', 'Customer Onboarding')
  ),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  assigned_staff_name TEXT DEFAULT '',
  assigned_staff_email TEXT DEFAULT '',
  assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  order_id UUID REFERENCES public.rimi_sales_orders(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Realtime RLS Policies
ALTER TABLE public.rimi_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_customer_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rimi_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "rimi_warehouses_access" ON public.rimi_warehouses;
  CREATE POLICY "rimi_warehouses_access" ON public.rimi_warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_products_access" ON public.rimi_products;
  CREATE POLICY "rimi_products_access" ON public.rimi_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_customers_access" ON public.rimi_customers;
  CREATE POLICY "rimi_customers_access" ON public.rimi_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_activity_access" ON public.rimi_customer_activity;
  CREATE POLICY "rimi_activity_access" ON public.rimi_customer_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_batches_access" ON public.rimi_inventory_batches;
  CREATE POLICY "rimi_batches_access" ON public.rimi_inventory_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_movements_access" ON public.rimi_stock_movements;
  CREATE POLICY "rimi_movements_access" ON public.rimi_stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_orders_access" ON public.rimi_sales_orders;
  CREATE POLICY "rimi_orders_access" ON public.rimi_sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_items_access" ON public.rimi_order_items;
  CREATE POLICY "rimi_items_access" ON public.rimi_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_payments_access" ON public.rimi_payments;
  CREATE POLICY "rimi_payments_access" ON public.rimi_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_vehicles_access" ON public.rimi_vehicles;
  CREATE POLICY "rimi_vehicles_access" ON public.rimi_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_routes_access" ON public.rimi_delivery_routes;
  CREATE POLICY "rimi_routes_access" ON public.rimi_delivery_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_deliveries_access" ON public.rimi_deliveries;
  CREATE POLICY "rimi_deliveries_access" ON public.rimi_deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "rimi_tasks_access" ON public.rimi_tasks;
  CREATE POLICY "rimi_tasks_access" ON public.rimi_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;
