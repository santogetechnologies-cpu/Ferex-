-- =============================================================================
-- FEREX - FIX TASKS SCHEMA, COLUMNS, CONSTRAINTS & RLS
-- Migration: 20260917000005_fix_tasks_and_counselor_rls.sql
-- =============================================================================

-- 1. Add missing columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT '';

-- 2. Drop restrictive check constraints on priority and status
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 3. Convert due_date to TEXT so dates like '2026-09-25' or '' don't cause casting errors
ALTER TABLE public.tasks ALTER COLUMN due_date TYPE TEXT USING due_date::TEXT;

-- 4. Enable RLS and establish clean policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_all_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin_manage" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_select_assigned" ON public.tasks;
DROP POLICY IF EXISTS "tasks_counselor_update_assigned" ON public.tasks;
DROP POLICY IF EXISTS "tasks_anon_read_write" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_anon_all" ON public.tasks;

-- Allow authenticated users to perform all operations
CREATE POLICY "tasks_authenticated_all" ON public.tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon key to perform operations
CREATE POLICY "tasks_anon_all" ON public.tasks
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Ensure Realtime publication includes tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
