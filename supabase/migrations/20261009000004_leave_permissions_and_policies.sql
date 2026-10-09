-- ==============================================================================
-- MIGRATION: 20261009000004_leave_permissions_and_policies.sql
-- Enterprise Leave Policies, Hourly Permissions, Half-Day & Monetizable Rules
-- ==============================================================================

-- 1. LEAVE POLICY CONFIGURATION TABLE (Central SuperAdmin Configured)
CREATE TABLE IF NOT EXISTS public.leave_policy_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 'CL', 'SL', 'AL', 'UNPLANNED', 'HOURLY_PERM', 'HALF_DAY', 'UNPAID'
    category TEXT NOT NULL CHECK (category IN ('full_day', 'half_day', 'hourly_permission', 'emergency')),
    division TEXT NOT NULL DEFAULT 'all', -- 'all', 'education', 'rimi', 'trade', 'digital'
    annual_quota_days NUMERIC(5,2) NOT NULL DEFAULT 12.0,
    monthly_max_permission_hours NUMERIC(4,2) NOT NULL DEFAULT 4.0,
    is_monetizable BOOLEAN NOT NULL DEFAULT TRUE, -- Paid vs Deducted
    is_encashable BOOLEAN NOT NULL DEFAULT FALSE,
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. LEAVE & PERMISSION REQUESTS TABLE (Staff & Admin Applications)
CREATE TABLE IF NOT EXISTS public.leave_permission_requests (
    id TEXT PRIMARY KEY,
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'staff',
    division TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('full_day_leave', 'half_day_leave', 'hourly_permission', 'unplanned_emergency')),
    policy_code TEXT NOT NULL, -- references leave_policy_configs(code)
    policy_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day_session TEXT CHECK (half_day_session IN ('first_half', 'second_half', NULL)),
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC(4,2) DEFAULT 0.0,
    total_days NUMERIC(4,2) DEFAULT 1.0,
    is_monetizable BOOLEAN NOT NULL DEFAULT TRUE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by_id TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leave_policy_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_permission_requests ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anon users full CRUD for seamless portal sync
DROP POLICY IF EXISTS "leave_policy_configs_all" ON public.leave_policy_configs;
CREATE POLICY "leave_policy_configs_all" ON public.leave_policy_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leave_permission_requests_all" ON public.leave_permission_requests;
CREATE POLICY "leave_permission_requests_all" ON public.leave_permission_requests FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'leave_policy_configs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_policy_configs;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'leave_permission_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_permission_requests;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Seed Default Policy Configurations
INSERT INTO public.leave_policy_configs (id, name, code, category, division, annual_quota_days, monthly_max_permission_hours, is_monetizable, is_encashable, description)
VALUES
('pol-cl', 'Casual Leave (CL)', 'CL', 'full_day', 'all', 12.0, 0.0, true, false, 'Standard paid personal leave for employees'),
('pol-sl', 'Sick / Medical Leave (SL)', 'SL', 'full_day', 'all', 10.0, 0.0, true, false, 'Medical and health related leaves with salary protection'),
('pol-pl', 'Annual Privilege Leave (PL)', 'PL', 'full_day', 'all', 15.0, 0.0, true, true, 'Paid annual holiday leave, encashable during yearly payroll appraisal'),
('pol-unplanned', 'Unplanned / Emergency Leave', 'UNPLANNED', 'emergency', 'all', 5.0, 0.0, true, false, 'Immediate notice emergency leaves for family or unforeseen crises'),
('pol-half-day', 'Half-Day Leave (Morning / Evening)', 'HALF_DAY', 'half_day', 'all', 8.0, 0.0, true, false, 'Half shift leave (4 working hours) with 50% shift credit'),
('pol-hourly-perm', 'Hourly Working Permission', 'HOURLY_PERM', 'hourly_permission', 'all', 0.0, 4.0, true, false, 'Short 1-2 hour permission for bank/doctor visits without salary deduction'),
('pol-unpaid', 'Unpaid Leave / Loss of Pay (LOP)', 'UNPAID', 'full_day', 'all', 99.0, 0.0, false, false, 'Leaves beyond quota; days will be deducted in monthly payroll calculation')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    annual_quota_days = EXCLUDED.annual_quota_days,
    monthly_max_permission_hours = EXCLUDED.monthly_max_permission_hours,
    is_monetizable = EXCLUDED.is_monetizable;
