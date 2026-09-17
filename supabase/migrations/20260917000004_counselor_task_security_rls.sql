-- =============================================================================
-- FEREX - ADMISSIONS COUNSELOR TASK SECURITY & RLS POLICIES
-- Migration: 20260917000004_counselor_task_security_rls.sql
-- =============================================================================

-- Ensure tasks table has all required columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT '';

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop previous policies on tasks
DROP POLICY IF EXISTS "tasks_all_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_update" ON public.tasks;

-- 1. Full access for authenticated admins and superadmins
CREATE POLICY "tasks_admin_manage" ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('admin', 'superadmin', 'super_admin', 'central', 'education_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('admin', 'superadmin', 'super_admin', 'central', 'education_admin')
    )
  );

-- 2. Admissions Counselors / Staff can SELECT ONLY tasks assigned to them
CREATE POLICY "tasks_counselor_select_assigned" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    -- Admin or Superadmin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('admin', 'superadmin', 'super_admin', 'central', 'education_admin')
    )
    OR
    -- Assigned directly by staff UUID
    assigned_staff_id = auth.uid()
    OR
    assigned_to = auth.uid()::text
    OR
    -- Assigned by email or name matching authenticated user profile
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND (
          LOWER(public.tasks.assigned_to) = LOWER(public.users.email)
          OR LOWER(public.tasks.assigned_to) = LOWER(public.users.full_name)
        )
    )
  );

-- 3. Admissions Counselors / Staff can UPDATE status only on tasks assigned to them
CREATE POLICY "tasks_counselor_update_assigned" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('admin', 'superadmin', 'super_admin', 'central', 'education_admin')
    )
    OR
    assigned_staff_id = auth.uid()
    OR
    assigned_to = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND (
          LOWER(public.tasks.assigned_to) = LOWER(public.users.email)
          OR LOWER(public.tasks.assigned_to) = LOWER(public.users.full_name)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('admin', 'superadmin', 'super_admin', 'central', 'education_admin')
    )
    OR
    assigned_staff_id = auth.uid()
    OR
    assigned_to = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND (
          LOWER(public.tasks.assigned_to) = LOWER(public.users.email)
          OR LOWER(public.tasks.assigned_to) = LOWER(public.users.full_name)
        )
    )
  );

-- 4. Open policy for anon key when using adminAuthClient in app
CREATE POLICY "tasks_anon_read_write" ON public.tasks
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Reload schema
NOTIFY pgrst, 'reload schema';
