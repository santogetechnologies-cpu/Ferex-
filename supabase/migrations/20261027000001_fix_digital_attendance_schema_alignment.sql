-- Migration: 20261027000001_fix_digital_attendance_schema_alignment.sql
-- Description: Aligns attendance_timesheets schema with TypeScript API expectations.
--   Adds missing boolean columns (is_admin_verified, is_superadmin_locked) and
--   admin/superadmin identity columns that the frontend code reads/writes.
--   Fixes status enum alignment. Adds missing columns to digital_projects for
--   proper PM assignment. Adds assigned_staff_id to digital_tasks.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ATTENDANCE TIMESHEETS: Add missing columns expected by the TypeScript API
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.attendance_timesheets
  ADD COLUMN IF NOT EXISTS is_admin_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_superadmin_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by_admin_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by_admin_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locked_by_superadmin_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locked_by_superadmin_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Backfill date from work_date where it exists
UPDATE public.attendance_timesheets
SET date = work_date
WHERE date IS NULL AND work_date IS NOT NULL;

-- Backfill date from clock_in if still null
UPDATE public.attendance_timesheets
SET date = DATE(clock_in)
WHERE date IS NULL AND clock_in IS NOT NULL;

-- Sync is_admin_verified from old verified_by column (backward compat)
UPDATE public.attendance_timesheets
SET is_admin_verified = true,
    verified_by_admin_name = verified_by,
    verified_at = COALESCE(verified_at, updated_at, NOW())
WHERE verified_by IS NOT NULL AND verified_by != '' AND is_admin_verified = false;

-- Sync is_superadmin_locked from old locked_by column (backward compat)
UPDATE public.attendance_timesheets
SET is_superadmin_locked = true,
    locked_by_superadmin_name = locked_by,
    locked_at = COALESCE(locked_at, updated_at, NOW())
WHERE locked_by IS NOT NULL AND locked_by != '' AND is_superadmin_locked = false;

-- Normalize status values: 'Clocked In' -> 'active', 'Submitted' -> 'completed', 'Verified' -> 'verified', 'Locked' -> 'locked'
UPDATE public.attendance_timesheets SET status = 'active' WHERE status = 'Clocked In';
UPDATE public.attendance_timesheets SET status = 'completed' WHERE status = 'Submitted';
UPDATE public.attendance_timesheets SET status = 'verified' WHERE status = 'Verified';
UPDATE public.attendance_timesheets SET status = 'locked' WHERE status = 'Locked';

-- Also sync is_admin_verified where status is 'verified' or 'locked'
UPDATE public.attendance_timesheets
SET is_admin_verified = true
WHERE status IN ('verified', 'locked') AND is_admin_verified = false;

UPDATE public.attendance_timesheets
SET is_superadmin_locked = true
WHERE status = 'locked' AND is_superadmin_locked = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EMPLOYEE SALARIES: Add salary_type column (monthly / hourly / both)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.employee_salaries
  ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS monthly_base_salary NUMERIC(12,2) DEFAULT 50000.00,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT DEFAULT NULL;

-- Backfill monthly_base_salary from base_monthly_salary if it exists
UPDATE public.employee_salaries
SET monthly_base_salary = base_monthly_salary
WHERE monthly_base_salary = 50000.00 AND base_monthly_salary IS NOT NULL AND base_monthly_salary != 50000.00;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DIGITAL PROJECTS: Ensure assigned_staff_id is properly indexed and synced
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.digital_projects
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index on assigned_staff_email for PM project lookup performance
CREATE INDEX IF NOT EXISTS idx_digital_projects_assigned_staff_email ON public.digital_projects (assigned_staff_email);
CREATE INDEX IF NOT EXISTS idx_digital_projects_assigned_staff_id ON public.digital_projects (assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_digital_projects_status ON public.digital_projects (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DIGITAL TASKS: Add assigned_staff_id for proper PM task filtering
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.digital_tasks
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Task',
  ADD COLUMN IF NOT EXISTS sprint_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sprint_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS milestone_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS milestone_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_central_directive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_title TEXT DEFAULT NULL;

-- Backfill project_title from related project
UPDATE public.digital_tasks dt
SET project_title = dp.title
FROM public.digital_projects dp
WHERE dt.project_id = dp.id AND dt.project_title IS NULL;

-- Create indexes for PM task filtering
CREATE INDEX IF NOT EXISTS idx_digital_tasks_assigned_to_email ON public.digital_tasks (assigned_to_email);
CREATE INDEX IF NOT EXISTS idx_digital_tasks_assigned_staff_id ON public.digital_tasks (assigned_staff_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LEAVE PERMISSION REQUESTS: Ensure is_admin_request is backfilled
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.leave_permission_requests
  ADD COLUMN IF NOT EXISTS is_admin_request BOOLEAN DEFAULT false;

UPDATE public.leave_permission_requests
SET is_admin_request = true
WHERE user_role IN ('admin', 'superadmin', 'super_admin', 'education_admin', 'digital_admin', 'trade_admin', 'rimi_admin', 'central')
  AND is_admin_request = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MONTHLY PAYROLLS: Align column names with TypeScript interface
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.monthly_payrolls
  ADD COLUMN IF NOT EXISTS attended_days NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_hours NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12,2) DEFAULT 50000.00,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 300.00,
  ADD COLUMN IF NOT EXISTS calculated_gross_pay NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowances NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payroll_month TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS processed_by_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS processed_by_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill attended_days from present_days
UPDATE public.monthly_payrolls SET attended_days = present_days WHERE attended_days = 0 AND present_days IS NOT NULL;
-- Backfill verified_hours from total_verified_hours
UPDATE public.monthly_payrolls SET verified_hours = total_verified_hours WHERE verified_hours = 0 AND total_verified_hours IS NOT NULL;
-- Backfill base_salary from base_salary column (already same name in some schemas) and net_payable from net_salary
UPDATE public.monthly_payrolls SET net_payable = net_salary WHERE net_payable = 0 AND net_salary IS NOT NULL;
UPDATE public.monthly_payrolls SET calculated_gross_pay = net_salary WHERE calculated_gross_pay = 0 AND net_salary IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SHIFTS: Add target_type, assigned_staff_emails, assigned_roles columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.shifts
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'division',
  ADD COLUMN IF NOT EXISTS assigned_staff_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS half_day_threshold_hours NUMERIC(4,2) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS full_day_threshold_hours NUMERIC(4,2) DEFAULT 8.0;

-- Backfill threshold columns from existing hours columns
UPDATE public.shifts SET half_day_threshold_hours = half_day_hours WHERE half_day_threshold_hours = 4.0 AND half_day_hours != 4.0;
UPDATE public.shifts SET full_day_threshold_hours = full_day_hours WHERE full_day_threshold_hours = 8.0 AND full_day_hours != 8.0;

-- Update default shift assignments
UPDATE public.shifts SET
  assigned_staff_emails = ARRAY['digimanager@ferex.com', 'digital@ferex.com', 'pm@ferex.com', 'creative@ferex.com'],
  assigned_roles = ARRAY['digital_manager', 'pm', 'digital_staff', 'digital_admin'],
  target_type = 'division'
WHERE id = '55555555-5555-5555-5555-555555555005';

UPDATE public.shifts SET
  assigned_staff_emails = ARRAY['counselor@ferex.com', 'education@ferex.com'],
  assigned_roles = ARRAY['counselor', 'staff', 'education_admin'],
  target_type = 'division'
WHERE id = '55555555-5555-5555-5555-555555555002';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES: Ensure all new/updated tables have open policies for authenticated + anon
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'attendance_timesheets', 'employee_salaries', 'monthly_payrolls', 'shifts',
        'digital_projects', 'digital_tasks', 'digital_clients', 'leave_permission_requests',
        'leave_policy_configs'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. REALTIME: Add updated tables to realtime publication
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'attendance_timesheets', 'digital_projects', 'digital_tasks',
        'leave_permission_requests', 'shifts', 'employee_salaries', 'monthly_payrolls'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
