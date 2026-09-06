-- Migration: 20260906000001_email_and_gateway_configurations.sql
-- Description: Creates email_configurations, payment_gateways, and email_logs tables with strict Superadmin RLS policies.

-- 1. TABLE: email_configurations
CREATE TABLE IF NOT EXISTS public.email_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_provider VARCHAR(50) NOT NULL DEFAULT 'resend',
    fallback_provider VARCHAR(50) DEFAULT 'brevo',
    environment VARCHAR(20) NOT NULL DEFAULT 'live',
    global_sender_name VARCHAR(255) NOT NULL DEFAULT 'Ferex Ventures Enterprise HQ',
    global_sender_email VARCHAR(255) NOT NULL DEFAULT 'notifications@ferexventures.com',
    reply_to_email VARCHAR(255) DEFAULT 'support@ferexventures.com',
    providers JSONB NOT NULL DEFAULT '{}'::jsonb,
    division_routing JSONB NOT NULL DEFAULT '{}'::jsonb,
    rate_limit_per_minute INT DEFAULT 120,
    track_opens_and_clicks BOOLEAN DEFAULT true,
    enforce_tls BOOLEAN DEFAULT true,
    webhook_secret VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) DEFAULT 'Super Admin'
);

ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read email_configurations for authenticated users"
ON public.email_configurations FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write email_configurations strictly for superadmins"
ON public.email_configurations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role IN ('superadmin', 'super_admin', 'central')
    )
);

-- 2. TABLE: payment_gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_publishable_key VARCHAR(255) NOT NULL DEFAULT '',
    stripe_secret_key VARCHAR(255) NOT NULL DEFAULT '',
    stripe_webhook_secret VARCHAR(255) DEFAULT '',
    stripe_currency VARCHAR(10) DEFAULT 'INR',
    is_stripe_live BOOLEAN DEFAULT false,
    upi_id VARCHAR(255) NOT NULL DEFAULT 'ferex.ventures@okaxis',
    upi_payee_name VARCHAR(255) NOT NULL DEFAULT 'Ferex Ventures Private Limited',
    upi_merchant_code VARCHAR(100) DEFAULT 'FEREX8890',
    upi_qr_image_url TEXT,
    is_upi_active BOOLEAN DEFAULT true,
    division_routing JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) DEFAULT 'Super Admin'
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read payment_gateways for authenticated users"
ON public.payment_gateways FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write payment_gateways strictly for superadmins"
ON public.payment_gateways FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role IN ('superadmin', 'super_admin', 'central')
    )
);

-- 3. TABLE: email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id VARCHAR(100) PRIMARY KEY,
    division VARCHAR(50) NOT NULL,
    provider VARCHAR(50) DEFAULT 'resend',
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    template_type VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    status VARCHAR(50) DEFAULT 'Delivered',
    reference_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read email_logs for authenticated users"
ON public.email_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert email_logs for authenticated users"
ON public.email_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_division ON public.email_logs(division);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
