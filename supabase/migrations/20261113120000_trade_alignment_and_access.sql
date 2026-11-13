-- Trade: document uploads were refused by the database (required a shipment link the app never has, and a fixed list of
-- document types), so documents only ever lived in one browser. Aligns the tables, restricts access to Trade staff, and
-- enforces in the database that only admins verify attendance.

-- 1. Documents belong to an order (by order_no / order_id), not to the legacy shipments table.
ALTER TABLE public.trade_documents DROP CONSTRAINT IF EXISTS trade_documents_doc_type_check;
ALTER TABLE public.trade_documents ALTER COLUMN shipment_id DROP NOT NULL;
ALTER TABLE public.trade_documents ALTER COLUMN document_url DROP NOT NULL;
ALTER TABLE public.trade_documents ALTER COLUMN document_url SET DEFAULT '';
ALTER TABLE public.trade_documents
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.trade_documents DROP CONSTRAINT IF EXISTS trade_documents_status_check;
ALTER TABLE public.trade_documents ADD CONSTRAINT trade_documents_status_check
  CHECK (status IS NULL OR status IN ('Pending', 'Submitted', 'Verified', 'Rejected'));

-- 2. Payments keep their order, even when only the order number was known.
UPDATE public.trade_payments p SET order_id = o.id FROM public.trade_orders o WHERE p.order_id IS NULL AND p.order_no = o.order_no;

-- 3. Chat messages are stored, not kept in memory.
ALTER TABLE public.trade_messages ALTER COLUMN conversation_id SET DEFAULT 'client_portal';

-- 4. Who may use Trade data: Trade staff and head-office admins. Anonymous access is removed.
CREATE OR REPLACE FUNCTION public.is_trade_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.role() = 'service_role' OR coalesce(public.get_auth_user_role(), '') IN
    ('superadmin', 'super_admin', 'central', 'admin', 'trade', 'trade_admin', 'global_trade', 'logistics_officer', 'trade_staff');
$$;
REVOKE ALL ON FUNCTION public.is_trade_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trade_staff() TO authenticated, service_role;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['trade_clients', 'trade_orders', 'trade_documents', 'trade_payments', 'trade_tasks', 'trade_tickets',
    'trade_invoices', 'trade_shipments', 'trade_messages', 'trade_notifications', 'trade_bonded_inventory', 'trade_cargo_losses']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_trade_staff()) WITH CHECK (public.is_trade_staff())', t || '_staff', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- 5. Live sync for Trade messages and shipments.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trade_messages', 'trade_shipments'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 6. Only admins verify, lock or unlock attendance. A staff member (for example a logistics officer or a warehouse
-- manager) can clock in/out and edit their own summary, but cannot verify their own or anyone else's hours.
CREATE OR REPLACE FUNCTION public.guard_timesheet_verification() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_role text := coalesce(public.get_auth_user_role(), '');
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF v_role IN ('logistics_officer', 'operations_manager', 'rimi_staff', 'warehouse_staff', 'warehouse_lead', 'warehouse_manager', 'trade_staff', 'counselor', 'student', 'staff')
     AND (NEW.is_admin_verified IS DISTINCT FROM OLD.is_admin_verified
       OR NEW.is_superadmin_locked IS DISTINCT FROM OLD.is_superadmin_locked
       OR NEW.verified_by_admin_id IS DISTINCT FROM OLD.verified_by_admin_id
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    RAISE EXCEPTION 'Only an admin can verify or lock attendance and shift hours';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_timesheet_verification ON public.attendance_timesheets;
CREATE TRIGGER trg_guard_timesheet_verification BEFORE UPDATE ON public.attendance_timesheets
  FOR EACH ROW EXECUTE FUNCTION public.guard_timesheet_verification();
