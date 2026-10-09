-- Migration: 20261009000002_ensure_rimi_payments_and_inventory.sql
-- Description: Ensures rimi_payments columns (including collected_by_name) and rimi_inventory_batches category alignment.

-- 1. RIMI PAYMENTS TABLE ALIGNMENT
ALTER TABLE IF EXISTS public.rimi_payments
  ADD COLUMN IF NOT EXISTS payment_no TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.rimi_sales_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer',
  ADD COLUMN IF NOT EXISTS reference_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS collected_by_name TEXT DEFAULT 'Finance Team',
  ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. RIMI CUSTOMERS OUTSTANDING AMOUNT ALIGNMENT
ALTER TABLE IF EXISTS public.rimi_customers
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Current';

-- 3. RIMI INVENTORY BATCHES CATEGORY ALIGNMENT
ALTER TABLE IF EXISTS public.rimi_inventory_batches
  ADD COLUMN IF NOT EXISTS product_category TEXT DEFAULT 'Frozen Seafood',
  ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT 'Frozen Product',
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'KG',
  ADD COLUMN IF NOT EXISTS initial_quantity NUMERIC(12, 2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS storage_temp TEXT DEFAULT '-18°C',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 4. RLS POLICIES FOR RIMI TABLES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'rimi_payments', 'rimi_customers', 'rimi_inventory_batches', 'rimi_products', 'rimi_sales_orders', 'rimi_deliveries', 'rimi_customer_activities'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- 5. REALTIME PUBLICATION
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'rimi_payments', 'rimi_customers', 'rimi_inventory_batches', 'rimi_products', 'rimi_sales_orders', 'rimi_deliveries'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
