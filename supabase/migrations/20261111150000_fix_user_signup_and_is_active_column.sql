-- ============================================================================
-- Migration: 20261111150000_fix_user_signup_and_is_active_column.sql
-- Description: Adds is_active column to public.users and hardens handle_new_user trigger
-- ============================================================================

-- 1. Ensure is_active and status columns exist on public.users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Backfill is_active if any rows have false / null
UPDATE public.users 
SET is_active = true 
WHERE is_active IS NULL OR (status = 'active' AND is_active IS NOT TRUE);

-- 2. Create or replace handle_new_user trigger function with exception safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
  v_name text;
  v_phone text;
  v_dept text;
  v_allowed_roles text[] := ARRAY[
    'superadmin', 'super_admin', 'central',
    'admin', 'education_admin', 'education',
    'staff', 'counselor', 'student',
    'trade', 'trade_admin', 'global_trade', 'logistics_officer', 'trade_client',
    'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'warehouse_staff', 'driver', 'retail_customer',
    'digital', 'digital_admin', 'ferex_digital', 'digital_manager', 'project_manager', 'pm', 'digimanager', 'digital_staff', 'designer', 'developer', 'digital_client'
  ];
BEGIN
  -- Extract role from metadata, strictly defaulting to 'student' if omitted or unknown
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

  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');
  v_dept  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), '');

  BEGIN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      phone,
      department,
      status,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_name,
      v_role,
      v_phone,
      v_dept,
      'active',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(users.full_name, ''), EXCLUDED.full_name),
      role = CASE 
        -- Never downgrade an existing admin or staff to student on conflict
        WHEN users.role IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'counselor', 'staff') AND EXCLUDED.role = 'student' THEN users.role
        ELSE EXCLUDED.role
      END,
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
      department = COALESCE(NULLIF(EXCLUDED.department, ''), users.department),
      status = COALESCE(users.status, 'active'),
      is_active = COALESCE(users.is_active, true),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger failure from aborting auth.users insert (which causes Supabase Auth 500 error)
    RAISE WARNING 'handle_new_user exception caught for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- 3. Ensure trigger on auth.users is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

