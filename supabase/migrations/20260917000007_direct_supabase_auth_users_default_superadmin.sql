-- =============================================================================
-- FEREX PLATFORM - DIRECT SUPABASE AUTH USERS DEFAULT TO 'superadmin' ROLE
-- Migration: 20260917000007_direct_supabase_auth_users_default_superadmin.sql
-- =============================================================================
-- When an administrator creates a user directly in the Supabase Auth Dashboard
-- (or via direct Supabase Auth API without role metadata), they automatically
-- receive the 'superadmin' role.
-- When a student registers on the frontend student portal, role 'student' is
-- passed explicitly in metadata and preserved as 'student'.
-- =============================================================================

-- 1. Update public.users table default role to 'superadmin'
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'superadmin';

-- 2. Update handle_new_user() trigger function
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
  -- If role is explicitly provided (e.g. 'student' from student registration), use it.
  -- If created directly inside Supabase Auth (metadata role is null/empty), default directly to 'superadmin'.
  v_role := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
    'superadmin'
  );

  -- Validate role against allowed list; fallback to 'superadmin' for direct auth
  IF NOT (v_role = ANY(v_allowed_roles)) THEN
    v_role := 'superadmin';
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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    CASE 
      WHEN v_role = 'superadmin' THEN 'Central Super Admin'
      ELSE SPLIT_PART(NEW.email, '@', 1)
    END
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
