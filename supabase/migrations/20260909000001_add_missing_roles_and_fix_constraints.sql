-- =============================================================================
-- FEREX PLATFORM - ADD MISSING ROLES TO DB CONSTRAINT & ENSURE STAFF ROUTES
-- Migration: 20260909000001_add_missing_roles_and_fix_constraints.sql
-- =============================================================================
-- Adds: project_manager, logistics_officer, operations_manager roles
-- to the public.users role CHECK constraint so they can be provisioned
-- by Central Super Admin → Roles & Users page.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop old role CHECK constraint and recreate with all roles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role IN (
      -- Central / Superadmin
      'superadmin', 'super_admin', 'central',
      -- Ferex Education
      'admin', 'education_admin', 'education',
      -- Ferex Education Staff
      'staff', 'counselor',
      -- Ferex Digital Agency
      'digital', 'digital_admin', 'ferex_digital',
      -- Ferex Digital Staff
      'project_manager',
      -- Global Trade ERP
      'trade', 'trade_admin', 'global_trade',
      -- Global Trade Staff
      'logistics_officer',
      -- Rimi Frozen Distribution
      'rimi', 'rimi_admin', 'rimi_frozen',
      -- Rimi Frozen Staff
      'operations_manager',
      -- Portal-Only Client Roles (external provisioned)
      'student', 'trade_client', 'rimi_client', 'digital_client'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Update isSuperAdmin helper function to match new role set
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Ensure any existing 'admin' role users have a valid role value
-- (Some old records may have just 'admin' which now maps to education)
-- ─────────────────────────────────────────────────────────────────────────────

-- Update get_auth_user_role to handle the extended role list
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  END IF;
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid() LIMIT 1;
  RETURN COALESCE(v_role, 'anon');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Update handle_new_user trigger to support all extended roles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_allowed_roles TEXT[] := ARRAY[
    'superadmin', 'super_admin', 'central',
    'admin', 'education_admin', 'education',
    'staff', 'counselor',
    'digital', 'digital_admin', 'ferex_digital', 'project_manager',
    'trade', 'trade_admin', 'global_trade', 'logistics_officer',
    'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager',
    'student', 'trade_client', 'rimi_client', 'digital_client'
  ];
BEGIN
  -- Extract role from metadata, validate, else default to 'staff'
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'staff'
  );

  -- Validate role against allowed list; default to 'staff' if invalid
  IF NOT (v_role = ANY(v_allowed_roles)) THEN
    v_role := 'staff';
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    ''
  );

  INSERT INTO public.users (id, email, full_name, role, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    v_phone,
    '',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
        role = CASE WHEN public.users.role IS NULL OR public.users.role = '' THEN EXCLUDED.role ELSE public.users.role END,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Recreate the create_division_admin function with full role support
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.create_division_admin(TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_division_admin(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_department TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_allowed_roles TEXT[] := ARRAY[
    'superadmin', 'super_admin', 'central',
    'admin', 'education_admin', 'education',
    'staff', 'counselor',
    'digital', 'digital_admin', 'ferex_digital', 'project_manager',
    'trade', 'trade_admin', 'global_trade', 'logistics_officer',
    'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager'
  ];
BEGIN
  -- Only super admins can call this
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: only Super Admins can provision division accounts.';
  END IF;

  -- Validate role
  IF NOT (p_role = ANY(v_allowed_roles)) THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Generate user ID
  v_user_id := gen_random_uuid();

  -- Insert into users table
  INSERT INTO public.users (id, email, full_name, role, department, created_at, updated_at)
  VALUES (v_user_id, p_email, p_full_name, p_role, p_department, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        updated_at = NOW()
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Update RLS policies to include all division roles
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing policies that may be too restrictive
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_super_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Allow users to read their own profile
CREATE POLICY "users_read_own"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR
    public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central')
  );

-- Super admins can do everything on users table
CREATE POLICY "users_super_admin_all"
  ON public.users
  FOR ALL
  USING (
    public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('superadmin', 'super_admin', 'central')
  );

-- All authenticated users can update their own profile
CREATE POLICY "users_self_update"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger-based inserts (new user created via auth)
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Add helpful index for role-based queries
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role_division ON public.users(role)
  WHERE role NOT IN ('student', 'trade_client', 'rimi_client', 'digital_client');
