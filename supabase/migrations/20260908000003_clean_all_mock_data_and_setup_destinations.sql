-- =============================================================================
-- FEREX ENTERPRISE PLATFORM - TOTAL CLEAN MIGRATION & DESTINATIONS SCHEMA
-- =============================================================================

-- STEP 1: CREATE DESTINATIONS CATALOG TABLE (WITH RLS)
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  flag TEXT DEFAULT '🌍',
  currency TEXT DEFAULT 'EUR',
  authority TEXT DEFAULT '',
  acronym TEXT DEFAULT '',
  processing TEXT DEFAULT '15-30 Days',
  fee TEXT DEFAULT '€50',
  desk TEXT DEFAULT '',
  badge TEXT DEFAULT 'Accredited',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on destinations
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "destinations_read_all" ON public.destinations;
DROP POLICY IF EXISTS "destinations_manage_admin" ON public.destinations;

-- Public read for portal & students
CREATE POLICY "destinations_read_all" ON public.destinations
  FOR SELECT TO authenticated, anon USING (true);

-- Admin manage policy
CREATE POLICY "destinations_manage_admin" ON public.destinations
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'education')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'education')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: SAFELY PURGE MOCK DATA (SKIPS MISSING TABLES AUTOMATICALLY)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ 
DECLARE 
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'destinations', 'universities', 'applications', 'student_documents',
    'offer_letters', 'final_acceptance', 'nawa_records', 'visa_tracking',
    'visa_applications', 'pre_departure_checklists', 'application_checklist',
    'payments', 'invoices', 'receipts', 'credit_notes',
    'meetings', 'support_tickets', 'ticket_messages', 'ticket_replies', 'tasks',
    'rimi_products', 'rimi_sales_orders', 'rimi_order_items', 'rimi_inventory', 'rimi_batches', 'rimi_payments',
    'digital_clients', 'digital_projects', 'digital_invoices', 'digital_deliverables', 'digital_tasks',
    'trade_clients', 'trade_shipments', 'trade_documents', 'trade_invoices', 'trade_payments'
  ];
BEGIN 
  FOREACH tbl IN ARRAY tbls LOOP 
    IF to_regclass('public.' || tbl) IS NOT NULL THEN 
      EXECUTE 'DELETE FROM public.' || quote_ident(tbl); 
    END IF; 
  END LOOP; 
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: SYSTEM CONFIGURATION TABLE (WITH RLS ENABLED)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_read" ON public.system_config;
DROP POLICY IF EXISTS "system_config_manage" ON public.system_config;

-- Allow read access
CREATE POLICY "system_config_read" ON public.system_config
  FOR SELECT TO authenticated, anon USING (true);

-- Allow manage access for administrative roles
CREATE POLICY "system_config_manage" ON public.system_config
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'trade_admin', 'rimi_admin', 'digital_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'trade_admin', 'rimi_admin', 'digital_admin')
    )
  );

-- Reset Payment Gateways
INSERT INTO public.system_config (key, value, updated_at)
VALUES (
  'payment_gateways',
  $json$
  {
    "stripe": {
      "enabled": false,
      "publishableKey": "",
      "secretKey": "",
      "webhookSecret": "",
      "environment": "sandbox",
      "supportedCurrencies": ["INR", "EUR", "USD"],
      "defaultCurrency": "INR",
      "autoCapture": true
    },
    "upi": {
      "enabled": false,
      "upiId": "",
      "merchantName": "",
      "merchantCode": "",
      "qrCodeEnabled": true,
      "collectRequestEnabled": true,
      "autoVerifyUtr": false
    },
    "divisions": {
      "education": { "allowStripe": false, "allowUpi": false, "customUpiId": "", "customMerchantName": "" },
      "digital": { "allowStripe": false, "allowUpi": false, "customUpiId": "", "customMerchantName": "" },
      "rimi": { "allowStripe": false, "allowUpi": false, "customUpiId": "", "customMerchantName": "" },
      "trade": { "allowStripe": false, "allowUpi": false, "customUpiId": "", "customMerchantName": "" }
    }
  }
  $json$::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- Reset Email Providers
INSERT INTO public.system_config (key, value, updated_at)
VALUES (
  'email_config',
  $json$
  {
    "activeProvider": "resend",
    "fallbackProvider": "custom_smtp",
    "environment": "live",
    "globalSenderName": "Ferex Enterprise HQ",
    "globalSenderEmail": "",
    "replyToEmail": "",
    "providers": {
      "resend": { "apiKey": "", "smtpHost": "smtp.resend.com", "smtpPort": 465, "smtpSecure": true },
      "brevo": { "apiKey": "", "smtpHost": "smtp-relay.brevo.com", "smtpPort": 587, "smtpUser": "", "smtpPassword": "", "smtpSecure": false },
      "aws_ses": { "apiKey": "", "apiSecret": "", "region": "eu-central-1", "smtpHost": "email-smtp.eu-central-1.amazonaws.com", "smtpPort": 587, "smtpSecure": true },
      "sendgrid": { "apiKey": "", "smtpHost": "smtp.sendgrid.net", "smtpPort": 587, "smtpUser": "apikey", "smtpPassword": "", "smtpSecure": false },
      "postmark": { "apiKey": "", "smtpHost": "smtp.postmarkapp.com", "smtpPort": 587, "smtpSecure": true },
      "custom_smtp": { "smtpHost": "", "smtpPort": 465, "smtpUser": "", "smtpPassword": "", "smtpSecure": true }
    },
    "divisionRouting": {
      "educationSenderName": "Ferex Education Admissions",
      "educationSenderEmail": "",
      "tradeSenderName": "Ferex Global Trade Desk",
      "tradeSenderEmail": "",
      "rimiSenderName": "Rimi Frozen Logistics",
      "rimiSenderEmail": "",
      "digitalSenderName": "Ferex Digital Client Hub",
      "digitalSenderEmail": ""
    },
    "rateLimitPerMinute": 120,
    "trackOpensAndClicks": true,
    "enforceTls": true,
    "webhookSecret": ""
  }
  $json$::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
