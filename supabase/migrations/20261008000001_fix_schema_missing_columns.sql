-- Migration: 20261008000001_fix_schema_missing_columns.sql
-- Description: Add missing columns across rimi_deliveries, rimi_payments, support_tickets, and users tables.

-- 1. Ensure rimi_deliveries columns
ALTER TABLE IF EXISTS public.rimi_deliveries
  ADD COLUMN IF NOT EXISTS arrival_temp TEXT DEFAULT '-18.0°C',
  ADD COLUMN IF NOT EXISTS delivery_no TEXT,
  ADD COLUMN IF NOT EXISTS order_no TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS destination_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS vehicle_id UUID,
  ADD COLUMN IF NOT EXISTS route_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS challan_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure rimi_payments columns
ALTER TABLE IF EXISTS public.rimi_payments
  ADD COLUMN IF NOT EXISTS collected_by_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_no TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS order_no TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Ensure support_tickets columns
ALTER TABLE IF EXISTS public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS ticket_no TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 4. Ensure users table destination / target country columns
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS target_country TEXT,
  ADD COLUMN IF NOT EXISTS destination_country TEXT;

-- 5. Ensure trade_clients table has vat_number and extended CRM columns
ALTER TABLE IF EXISTS public.trade_clients
  ADD COLUMN IF NOT EXISTS vat_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14, 2) DEFAULT 500000.00,
  ADD COLUMN IF NOT EXISTS portal_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 5. Notify realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rimi_deliveries;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rimi_payments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
