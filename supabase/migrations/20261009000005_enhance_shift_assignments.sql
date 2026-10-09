-- ==============================================================================
-- MIGRATION: 20261009000005_enhance_shift_assignments.sql
-- Add Target Staff & Role Assignments to Shift Timings
-- ==============================================================================

ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS assigned_staff_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_roles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'division' CHECK (target_type IN ('all', 'division', 'specific_staff', 'roles'));

-- Allow full update on shifts
DROP POLICY IF EXISTS "shifts_update_all" ON public.shifts;
CREATE POLICY "shifts_update_all" ON public.shifts FOR ALL USING (true) WITH CHECK (true);
