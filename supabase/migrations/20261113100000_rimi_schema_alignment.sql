-- Rimi: the app wrote columns the tables did not have, so sales orders, order items and payments were refused by the
-- database and only ever lived in each browser. This aligns the tables with the app, removes anonymous access and
-- publishes the remaining tables for live sync between Admin and Warehouse.

-- 1. Sales orders
ALTER TABLE public.rimi_sales_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_type text,
  ADD COLUMN IF NOT EXISTS assigned_staff_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_staff_name text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS territory text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS challan_url text,
  ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE public.rimi_sales_orders ALTER COLUMN distributor_id DROP NOT NULL;
ALTER TABLE public.rimi_sales_orders DROP CONSTRAINT IF EXISTS rimi_sales_orders_payment_status_check;
ALTER TABLE public.rimi_sales_orders ADD CONSTRAINT rimi_sales_orders_payment_status_check
  CHECK (payment_status IN ('Unpaid', 'Partial', 'Partially Paid', 'Paid', 'Overdue'));

-- 2. Order items
ALTER TABLE public.rimi_order_items
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.rimi_inventory_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_no text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS total_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.rimi_order_items ALTER COLUMN total_line_amount SET DEFAULT 0;
ALTER TABLE public.rimi_order_items ALTER COLUMN product_id DROP NOT NULL;
-- A product that appears on an old order could never be deleted (RESTRICT); keep the order line, drop the link.
ALTER TABLE public.rimi_order_items DROP CONSTRAINT IF EXISTS rimi_order_items_product_id_fkey;
ALTER TABLE public.rimi_order_items ADD CONSTRAINT rimi_order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.rimi_products(id) ON DELETE SET NULL;

-- 3. Payments
ALTER TABLE public.rimi_payments ALTER COLUMN distributor_id DROP NOT NULL;
ALTER TABLE public.rimi_payments ADD COLUMN IF NOT EXISTS collected_by_email text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rimi_payments_customer_id_fkey') THEN
    ALTER TABLE public.rimi_payments ADD CONSTRAINT rimi_payments_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.rimi_customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Products: categories and units are configurable in the app, so fixed lists rejected valid products.
ALTER TABLE public.rimi_products DROP CONSTRAINT IF EXISTS rimi_products_category_check;
ALTER TABLE public.rimi_products DROP CONSTRAINT IF EXISTS rimi_products_unit_check;
ALTER TABLE public.rimi_products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text;
CREATE TABLE IF NOT EXISTS public.rimi_product_categories (
  name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rimi_product_categories (name)
  SELECT DISTINCT category FROM public.rimi_products WHERE coalesce(category, '') <> ''
  ON CONFLICT DO NOTHING;
INSERT INTO public.rimi_product_categories (name) VALUES
  ('Frozen Seafood'), ('Frozen Meat & Poultry'), ('Frozen Vegetables'), ('Processed Food'), ('Ice Cream & Dairy')
  ON CONFLICT DO NOTHING;

-- 5. Vehicles, routes, deliveries
ALTER TABLE public.rimi_vehicles
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS min_temp_celsius numeric,
  ADD COLUMN IF NOT EXISTS gps_tracking_id text;
ALTER TABLE public.rimi_vehicles DROP CONSTRAINT IF EXISTS rimi_vehicles_status_check;
ALTER TABLE public.rimi_vehicles ADD CONSTRAINT rimi_vehicles_status_check
  CHECK (status IN ('Stationed', 'Available', 'On Route', 'Loading', 'Maintenance', 'Inactive'));

ALTER TABLE public.rimi_delivery_routes
  ADD COLUMN IF NOT EXISTS route_code text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS origin_facility text,
  ADD COLUMN IF NOT EXISTS destinations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.rimi_delivery_routes ALTER COLUMN origin_warehouse DROP NOT NULL;
ALTER TABLE public.rimi_delivery_routes ALTER COLUMN destination_region DROP NOT NULL;
ALTER TABLE public.rimi_delivery_routes ALTER COLUMN estimated_transit_hours TYPE numeric;
ALTER TABLE public.rimi_delivery_routes ALTER COLUMN status SET DEFAULT 'Active';

ALTER TABLE public.rimi_deliveries DROP CONSTRAINT IF EXISTS rimi_deliveries_delivery_status_check;
ALTER TABLE public.rimi_deliveries ADD CONSTRAINT rimi_deliveries_delivery_status_check
  CHECK (delivery_status IN ('Assigned', 'Loading', 'In Transit', 'Delivered', 'Returned', 'Failed'));
ALTER TABLE public.rimi_deliveries ALTER COLUMN vehicle_no DROP NOT NULL;
ALTER TABLE public.rimi_deliveries ALTER COLUMN driver_name DROP NOT NULL;

-- 6. Tasks: custom categories, start/due date-times and an explicit "Incomplete" outcome.
ALTER TABLE public.rimi_tasks DROP CONSTRAINT IF EXISTS rimi_tasks_task_type_check;
ALTER TABLE public.rimi_tasks DROP CONSTRAINT IF EXISTS rimi_tasks_priority_check;
ALTER TABLE public.rimi_tasks ADD CONSTRAINT rimi_tasks_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent', 'Critical'));
ALTER TABLE public.rimi_tasks DROP CONSTRAINT IF EXISTS rimi_tasks_status_check;
ALTER TABLE public.rimi_tasks ADD CONSTRAINT rimi_tasks_status_check
  CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Incomplete', 'Cancelled'));
ALTER TABLE public.rimi_tasks
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS assigned_by text,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS due_at timestamptz;
UPDATE public.rimi_tasks SET due_at = (due_date::timestamp + interval '18 hours') AT TIME ZONE 'Asia/Kolkata'
  WHERE due_at IS NULL AND due_date IS NOT NULL;

-- 7. Notifications: stored alerts carry a category/severity/link; read + dismissed state is kept per user so it
-- follows the person across devices (it used to live in browser storage).
ALTER TABLE public.rimi_notifications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS link text;
CREATE TABLE IF NOT EXISTS public.rimi_notification_state (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, alert_id)
);

-- 8. Access: Rimi staff (and central/super admins) only. Anonymous access is removed.
CREATE OR REPLACE FUNCTION public.is_rimi_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.role() = 'service_role' OR coalesce(public.get_auth_user_role(), '') IN
    ('superadmin', 'super_admin', 'central', 'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'rimi_staff');
$$;
REVOKE ALL ON FUNCTION public.is_rimi_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_rimi_staff() TO authenticated, service_role;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['rimi_customers', 'rimi_customer_activity', 'rimi_products', 'rimi_product_categories',
    'rimi_inventory_batches', 'rimi_stock_movements', 'rimi_sales_orders', 'rimi_order_items', 'rimi_payments',
    'rimi_deliveries', 'rimi_delivery_routes', 'rimi_vehicles', 'rimi_warehouses', 'rimi_tasks', 'rimi_notifications',
    'rimi_messages', 'rimi_batches', 'rimi_inventory', 'rimi_distributors']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_rimi_staff()) WITH CHECK (public.is_rimi_staff())', t || '_staff', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

ALTER TABLE public.rimi_notification_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rimi_notification_state_own ON public.rimi_notification_state;
CREATE POLICY rimi_notification_state_own ON public.rimi_notification_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.rimi_notification_state FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rimi_notification_state TO authenticated;

-- 9. Live sync for the tables that were not published yet.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rimi_warehouses', 'rimi_vehicles', 'rimi_order_items', 'rimi_stock_movements',
    'rimi_delivery_routes', 'rimi_customer_activity', 'rimi_product_categories', 'rimi_notifications']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
