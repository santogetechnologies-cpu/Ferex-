-- Dispatch carries everything a driver needs: shop, address, contact, PIN, map link, order summary, schedule and instructions.
ALTER TABLE public.rimi_deliveries
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS map_url text,
  ADD COLUMN IF NOT EXISTS order_summary text,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS driver_user_id uuid;
CREATE INDEX IF NOT EXISTS rimi_deliveries_driver_user_idx ON public.rimi_deliveries (driver_user_id);
