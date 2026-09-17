-- =============================================================================
-- FEREX PLATFORM - DEFAULT DIRECT SUPABASE AUTH USERS TO 'student' ROLE
-- Migration: 20260917000006_fix_default_new_user_role_student.sql
-- =============================================================================
-- Ensures any user created directly in Supabase Auth (e.g. Supabase Dashboard,
-- direct Auth API signup, email/password) without an explicit admin/staff role
-- metadata defaults strictly to 'student' role.
-- =============================================================================

-- 1. Update public.users table default role to 'student'
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'student';

-- 2. Update handle_new_user() trigger function to default strictly to 'student'
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
  -- Extract role from metadata, strictly default to 'student' if null or missing
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'student'
  );

  -- Validate role against allowed list; fallback strictly to 'student' if invalid
  IF NOT (v_role = ANY(v_allowed_roles)) THEN
    v_role := 'student';
  END IF;

  -- Superadmin auto-assignment for designated root administrator emails
  IF LOWER(NEW.email) IN (
    'admin@ferex.com',
    'admin@ferexventures.com',
    'admin@santoge.com',
    'superadmin@ferex.com'
  ) OR LOWER(NEW.email) LIKE '%superadmin%' THEN
    v_role := 'superadmin';
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
        full_name = CASE WHEN public.users.full_name IS NULL OR public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
        role = CASE WHEN public.users.role IS NULL OR public.users.role = '' THEN EXCLUDED.role ELSE public.users.role END,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
