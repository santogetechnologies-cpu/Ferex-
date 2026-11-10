-- ============================================================================
-- Migration: 20261110140000_education_security_rls_and_triggers.sql
-- Description: Security lockdown, RLS hardening, and trigger fixes for Ferex Education
-- ============================================================================

-- 1. System Config Security Lockdown
-- Revoke all permissions from anon
REVOKE ALL ON public.system_config FROM anon;

-- Drop insecure public read/write policies from 20260917000001
DROP POLICY IF EXISTS "system_config_public_read"   ON public.system_config;
DROP POLICY IF EXISTS "system_config_public_insert" ON public.system_config;
DROP POLICY IF EXISTS "system_config_public_update" ON public.system_config;
DROP POLICY IF EXISTS "system_config_public_delete" ON public.system_config;

-- Re-enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read system_config
CREATE POLICY "system_config_auth_read" ON public.system_config
  FOR SELECT TO authenticated
  USING (true);

-- Allow only administrators and staff to modify system_config
CREATE POLICY "system_config_admin_write" ON public.system_config
  FOR ALL TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff', 'digital_admin', 'trade_admin', 'rimi_admin')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff', 'digital_admin', 'trade_admin', 'rimi_admin')
    OR auth.role() = 'service_role'
  );

GRANT SELECT ON public.system_config TO authenticated;
GRANT ALL ON public.system_config TO service_role;

-- 2. Education Leads Security Lockdown
REVOKE ALL ON public.education_leads FROM anon;
REVOKE ALL ON public.education_lead_activities FROM anon;

DROP POLICY IF EXISTS "Education staff and admin have full access to leads" ON public.education_leads;
DROP POLICY IF EXISTS "Public can submit enquiry leads" ON public.education_leads;

-- Allow anonymous visitors to INSERT leads via public landing page
CREATE POLICY "Public can submit enquiry leads" ON public.education_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow staff and admins full read and management access on leads
CREATE POLICY "Education staff and admin manage leads" ON public.education_leads
  FOR ALL TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

GRANT INSERT ON public.education_leads TO anon;
GRANT ALL ON public.education_leads TO authenticated, service_role;

-- Lead Activities RLS
ALTER TABLE public.education_lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lead activities staff access" ON public.education_lead_activities;

CREATE POLICY "Lead activities staff access" ON public.education_lead_activities
  FOR ALL TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

GRANT ALL ON public.education_lead_activities TO authenticated, service_role;

-- 3. Fix handle_new_user Trigger (Never default to superadmin!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_name text;
  v_phone text;
  v_dept text;
  v_allowed_roles text[] := ARRAY[
    'superadmin', 'central', 'admin', 'education_admin', 'staff', 'counselor', 'student',
    'trade_admin', 'logistics_officer', 'trade_client',
    'rimi_admin', 'operations_manager', 'warehouse_staff', 'driver', 'retail_customer',
    'digital_admin', 'digital_manager', 'digital_staff', 'digital_client'
  ];
BEGIN
  -- Extract role from metadata, strictly defaulting to 'student' if omitted or unknown!
  v_role := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
    NULLIF(TRIM(NEW.raw_app_meta_data->>'role'), ''),
    'student'
  );

  IF NOT (v_role = ANY(v_allowed_roles)) THEN
    v_role := 'student';
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
  v_dept  := NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), '');

  INSERT INTO public.users (id, email, full_name, role, phone, department, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_phone,
    v_dept,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(users.full_name, ''), EXCLUDED.full_name),
    role = CASE 
      -- Never downgrade an existing admin or staff to student on conflict
      WHEN users.role IN ('central', 'superadmin', 'admin', 'education_admin', 'counselor', 'staff') AND EXCLUDED.role = 'student' THEN users.role
      ELSE EXCLUDED.role
    END,
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix education_payment_guard Trigger
CREATE OR REPLACE FUNCTION public.education_payment_guard()
RETURNS trigger AS $$
DECLARE
  pref record;
  agreement record;
  valid_user_roles text[] := ARRAY['central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff'];
BEGIN
  -- On INSERT: validate payment submission
  IF TG_OP = 'INSERT' THEN
    -- Allow standard payment types
    IF NEW.payment_type IS NULL OR NEW.payment_type = '' THEN
      NEW.payment_type := 'Installment Fee';
    END IF;
    
    -- Ensure status defaults to Pending if null
    IF NEW.status IS NULL OR NEW.status = '' THEN
      NEW.status := 'Pending';
    END IF;
  END IF;

  -- On UPDATE: allow finance admins AND counselors/staff to review/verify payments
  IF TG_OP = 'UPDATE' THEN
    IF NOT (public.education_finance_admin() OR public.ferex_role() = ANY(valid_user_roles) OR auth.role() = 'service_role') THEN
      RAISE EXCEPTION 'Only authorized admissions and finance staff can review payments';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix Restrictive Users Policies for Education Admins and Staff
DROP POLICY IF EXISTS ferex_users_write_guard ON public.users;
DROP POLICY IF EXISTS ferex_users_delete_guard ON public.users;

-- Permissive write guard policy allowing education admins and staff to manage education users
CREATE POLICY "ferex_users_admin_write_policy" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR public.digital_is_admin()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR public.digital_is_admin()
  );

CREATE POLICY "ferex_users_admin_delete_policy" ON public.users
  FOR DELETE TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin')
  );

-- 6. Fix Journey Workflow Progress Policies
ALTER TABLE public.education_workflow_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS education_workflow_read ON public.education_workflow_progress;
DROP POLICY IF EXISTS education_workflow_manage ON public.education_workflow_progress;
DROP POLICY IF EXISTS education_workflow_student_init ON public.education_workflow_progress;

-- Students can read their own workflow progress; staff and admins can read all
CREATE POLICY "education_workflow_read_policy" ON public.education_workflow_progress
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

-- Students can initialize their own stages
CREATE POLICY "education_workflow_student_init_policy" ON public.education_workflow_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

-- Staff and Admins can update workflow progress
CREATE POLICY "education_workflow_manage_policy" ON public.education_workflow_progress
  FOR ALL TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

GRANT ALL ON public.education_workflow_progress TO authenticated, service_role;

-- 7. Fix Service Agreements RLS (Counselor read & update support)
ALTER TABLE public.education_service_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS education_agreement_read ON public.education_service_agreements;
DROP POLICY IF EXISTS education_agreement_sign ON public.education_service_agreements;
DROP POLICY IF EXISTS education_agreement_update ON public.education_service_agreements;

CREATE POLICY "education_agreement_read_policy" ON public.education_service_agreements
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

CREATE POLICY "education_agreement_insert_policy" ON public.education_service_agreements
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

CREATE POLICY "education_agreement_update_policy" ON public.education_service_agreements
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

GRANT SELECT, INSERT, UPDATE ON public.education_service_agreements TO authenticated, service_role;

-- 8. Fix Student Documents RLS (Remove student_id IS NULL leak)
DROP POLICY IF EXISTS "documents_student_access" ON public.student_documents;
CREATE POLICY "documents_student_access" ON public.student_documents
  FOR ALL TO authenticated
  USING (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff')
    OR auth.role() = 'service_role'
  );

