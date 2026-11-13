-- Trade: invoices, letters of credit, bills of lading, packing lists and certificates become real records with their
-- own tables. They used to be views over uploaded documents with invented values (banks, vessels, weights, amounts).

-- Invoices: the old table was empty and not used by the app; rebuilt to match what the invoice screen captures.
DROP TABLE IF EXISTS public.trade_invoices CASCADE;
CREATE TABLE public.trade_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  buyer_name text NOT NULL DEFAULT '',
  seller_name text NOT NULL DEFAULT '',
  invoice_type text NOT NULL DEFAULT 'Commercial' CHECK (invoice_type IN ('Commercial', 'Proforma')),
  incoterms text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'INR', 'GBP', 'AED', 'PLN')),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  freight_charges numeric NOT NULL DEFAULT 0 CHECK (freight_charges >= 0),
  insurance_charges numeric NOT NULL DEFAULT 0 CHECK (insurance_charges >= 0),
  tax_charges numeric NOT NULL DEFAULT 0 CHECK (tax_charges >= 0),
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_terms text NOT NULL DEFAULT '',
  lc_reference text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payments can be tied to the invoice they settle.
ALTER TABLE public.trade_payments ADD COLUMN IF NOT EXISTS invoice_no text;

CREATE TABLE IF NOT EXISTS public.trade_letters_of_credit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  invoice_no text NOT NULL DEFAULT '',
  lc_type text NOT NULL DEFAULT '',
  applicant text NOT NULL DEFAULT '',
  beneficiary text NOT NULL DEFAULT '',
  issuing_bank text NOT NULL DEFAULT '',
  advising_bank text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'INR', 'GBP', 'AED', 'PLN')),
  issue_date date NOT NULL DEFAULT current_date,
  expiry_date date,
  status text NOT NULL DEFAULT 'Issued',
  notes text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trade_bills_of_lading (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bl_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  carrier text NOT NULL DEFAULT '',
  vessel_name text NOT NULL DEFAULT '',
  voyage_no text NOT NULL DEFAULT '',
  port_of_loading text NOT NULL DEFAULT '',
  port_of_discharge text NOT NULL DEFAULT '',
  shipper text NOT NULL DEFAULT '',
  consignee text NOT NULL DEFAULT '',
  notify_party text NOT NULL DEFAULT '',
  container_no text NOT NULL DEFAULT '',
  cargo_description text NOT NULL DEFAULT '',
  total_packages integer NOT NULL DEFAULT 0 CHECK (total_packages >= 0),
  package_type text NOT NULL DEFAULT '',
  gross_weight_kg numeric NOT NULL DEFAULT 0 CHECK (gross_weight_kg >= 0),
  freight_terms text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Original Surrendered', 'Telex Released', 'Accomplished', 'Cancelled')),
  notes text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trade_packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pl_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  invoice_no text NOT NULL DEFAULT '',
  buyer_name text NOT NULL DEFAULT '',
  cargo_description text NOT NULL DEFAULT '',
  package_type text NOT NULL DEFAULT '',
  total_packages integer NOT NULL DEFAULT 0 CHECK (total_packages >= 0),
  gross_weight_kg numeric NOT NULL DEFAULT 0 CHECK (gross_weight_kg >= 0),
  net_weight_kg numeric NOT NULL DEFAULT 0 CHECK (net_weight_kg >= 0),
  dimensions text NOT NULL DEFAULT '',
  volume_cbm numeric NOT NULL DEFAULT 0 CHECK (volume_cbm >= 0),
  marks_numbers text NOT NULL DEFAULT '',
  container_status text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_packing_net_le_gross CHECK (net_weight_kg <= gross_weight_kg OR gross_weight_kg = 0)
);

CREATE TABLE IF NOT EXISTS public.trade_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.trade_orders(id) ON DELETE CASCADE,
  order_no text NOT NULL DEFAULT '',
  cert_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  authority text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  exporter text NOT NULL DEFAULT '',
  importer text NOT NULL DEFAULT '',
  issue_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'Verified & Active' CHECK (status IN ('Verified & Active', 'Under Inspection', 'Expired', 'Revoked')),
  notes text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Same access as the rest of Trade: staff only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trade_invoices', 'trade_letters_of_credit', 'trade_bills_of_lading', 'trade_packing_lists', 'trade_certificates'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_trade_staff()) WITH CHECK (public.is_trade_staff())', t || '_staff', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
