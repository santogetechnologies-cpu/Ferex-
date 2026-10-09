-- Migration: 20261009000003_enterprise_timesheets_shifts_payroll.sql
-- Description: Enterprise Shifts, Daily Clock-In/Clock-Out Work Logs, Verification/Locking, Salary Settings, and Monthly Payroll.

-- 1. SHIFTS CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  division TEXT NOT NULL DEFAULT 'all', -- 'all', 'education', 'trade', 'rimi', 'digital', 'central'
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  grace_period_mins INTEGER NOT NULL DEFAULT 15,
  half_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.0,
  full_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default enterprise shifts
INSERT INTO public.shifts (id, name, division, start_time, end_time, grace_period_mins, half_day_hours, full_day_hours)
VALUES
  ('55555555-5555-5555-5555-555555555001', 'General Corporate Shift (HQ)', 'all', '09:00:00', '18:00:00', 15, 4.0, 8.0),
  ('55555555-5555-5555-5555-555555555002', 'Education Admissions Morning Shift', 'education', '09:30:00', '18:30:00', 15, 4.0, 8.0),
  ('55555555-5555-5555-5555-555555555003', 'Rimi Cold Chain Distribution Shift', 'rimi', '08:00:00', '17:00:00', 15, 4.0, 8.0),
  ('55555555-5555-5555-5555-555555555004', 'Global Trade Port Logistics Shift', 'trade', '09:00:00', '18:00:00', 15, 4.0, 8.0),
  ('55555555-5555-5555-5555-555555555005', 'Digital Agency Creative & Dev Shift', 'digital', '10:00:00', '19:00:00', 30, 4.0, 8.0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- 2. ATTENDANCE & TIMESHEETS TABLE (WITH SHIFT WORK SUMMARY & DUAL-TIER LOCKING)
CREATE TABLE IF NOT EXISTS public.attendance_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  division TEXT NOT NULL DEFAULT 'central',
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  shift_name TEXT DEFAULT 'General Corporate Shift',
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  total_hours NUMERIC(5, 2) DEFAULT 0.00,
  break_minutes INTEGER DEFAULT 0,
  work_summary TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Clocked In', -- 'Clocked In', 'Submitted', 'Verified', 'Locked', 'Disputed'
  verified_by TEXT DEFAULT '',
  verified_at TIMESTAMPTZ,
  locked_by TEXT DEFAULT '',
  locked_at TIMESTAMPTZ,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EMPLOYEE SALARY CONFIGURATION TABLE (MANAGED BY SUPER ADMIN)
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL UNIQUE,
  user_role TEXT NOT NULL,
  division TEXT NOT NULL,
  base_monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
  hourly_rate NUMERIC(10, 2) DEFAULT 300.00,
  currency TEXT DEFAULT 'INR',
  bank_name TEXT DEFAULT 'HDFC Bank Ltd',
  account_number TEXT DEFAULT 'XXXX-XXXX-4910',
  ifsc_code TEXT DEFAULT 'HDFC0001234',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default salaries for standard enterprise personnel
INSERT INTO public.employee_salaries (user_email, user_name, user_role, division, base_monthly_salary, hourly_rate)
VALUES
  ('education@ferex.com', 'Admissions Lead Counselor', 'education_admin', 'education', 75000.00, 450.00),
  ('trade@ferex.com', 'Global Trade Director', 'trade_admin', 'trade', 95000.00, 550.00),
  ('rimi@ferex.com', 'Rimi Operations Lead', 'rimi_admin', 'rimi', 85000.00, 500.00),
  ('digital@ferex.com', 'Ferex Digital Director', 'digital_admin', 'digital', 90000.00, 520.00),
  ('digimanager@ferex.com', 'Digital Manager', 'project_manager', 'digital', 70000.00, 400.00),
  ('pm@ferex.com', 'Digital Project Manager', 'project_manager', 'digital', 70000.00, 400.00),
  ('creative@ferex.com', 'Lead Creative Designer', 'digital_staff', 'digital', 55000.00, 320.00),
  ('admin@ferex.com', 'Central Super Admin', 'superadmin', 'central', 120000.00, 700.00)
ON CONFLICT (user_email) DO UPDATE SET
  base_monthly_salary = EXCLUDED.base_monthly_salary,
  hourly_rate = EXCLUDED.hourly_rate;

-- 4. MONTHLY PAYROLL TABLE
CREATE TABLE IF NOT EXISTS public.monthly_payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_month TEXT NOT NULL, -- e.g. "2026-10"
  division TEXT NOT NULL DEFAULT 'all',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  total_working_days INTEGER DEFAULT 26,
  present_days NUMERIC(5, 2) DEFAULT 26,
  total_verified_hours NUMERIC(6, 2) DEFAULT 208.0,
  base_salary NUMERIC(12, 2) NOT NULL,
  overtime_pay NUMERIC(12, 2) DEFAULT 0.00,
  deductions NUMERIC(12, 2) DEFAULT 0.00,
  net_salary NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Verified', 'Approved', 'Paid'
  paid_at TIMESTAMPTZ,
  processed_by TEXT DEFAULT 'Central Super Admin',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'shifts', 'attendance_timesheets', 'employee_salaries', 'monthly_payrolls'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- 6. REALTIME REPLICATION PUBLICATION
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'shifts', 'attendance_timesheets', 'employee_salaries', 'monthly_payrolls'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
