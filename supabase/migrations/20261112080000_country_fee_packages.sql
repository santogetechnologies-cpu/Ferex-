-- ============================================================================
-- Migration: 20261112080000_country_fee_packages.sql
-- Description: Adds fee_flow_mode and fee_package_id to education_student_preferences
--              to support Normal Flow vs Country Package billing assignment.
-- ============================================================================

-- 1. Add billing flow columns to education_student_preferences
ALTER TABLE public.education_student_preferences
  ADD COLUMN IF NOT EXISTS fee_flow_mode TEXT DEFAULT 'normal' CHECK (fee_flow_mode IN ('normal', 'package')),
  ADD COLUMN IF NOT EXISTS fee_package_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fee_package_assigned_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fee_package_assigned_by TEXT DEFAULT NULL;

-- 2. Create index for quick lookups by package_id
CREATE INDEX IF NOT EXISTS idx_edu_pref_fee_package ON public.education_student_preferences(fee_package_id)
  WHERE fee_package_id IS NOT NULL;

-- 3. Country fee packages are stored as JSON in system_config under key 'ferex_country_fee_packages'
--    (No separate table needed — same pattern as other configs in this codebase)
--    But ensure system_config row exists (upsert-safe via app layer)

-- 4. Grant access
GRANT SELECT, UPDATE ON public.education_student_preferences TO authenticated, service_role;

