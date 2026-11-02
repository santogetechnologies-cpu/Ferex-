BEGIN;

-- 1. Fix handle_new_user to read role and department from raw_user_meta_data as well as raw_app_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_name text;
  v_dept text;
  v_phone text;
BEGIN
  v_role := coalesce(
    nullif(NEW.raw_app_meta_data->>'role',''),
    nullif(NEW.raw_user_meta_data->>'role',''),
    'student'
  );
  v_name := coalesce(
    nullif(NEW.raw_user_meta_data->>'full_name',''),
    nullif(NEW.raw_user_meta_data->>'name',''),
    split_part(NEW.email, '@', 1)
  );
  v_dept := coalesce(
    nullif(NEW.raw_user_meta_data->>'department',''),
    CASE
      WHEN v_role IN ('digital_admin','digital','project_manager','digital_manager','account_manager','accountmanager','designer','developer') THEN 'Digital Operations'
      WHEN v_role IN ('trade_admin','trade','logistics_officer') THEN 'Trade Logistics'
      WHEN v_role IN ('rimi_admin','rimi','operations_manager') THEN 'Cold Chain Logistics'
      ELSE 'General'
    END
  );
  v_phone := coalesce(NEW.raw_user_meta_data->>'phone','');

  INSERT INTO public.users(id, email, full_name, role, department, phone, status, created_at, updated_at)
  VALUES(NEW.id, NEW.email, v_name, v_role, v_dept, v_phone, 'active', now(), now())
  ON CONFLICT(id) DO UPDATE SET
    role = CASE WHEN EXCLUDED.role <> 'student' THEN EXCLUDED.role ELSE public.users.role END,
    full_name = EXCLUDED.full_name,
    department = coalesce(nullif(EXCLUDED.department,''), public.users.department),
    status = 'active',
    updated_at = now();

  RETURN NEW;
END $$;

-- 2. Update ferex_guard_user_role to permit Digital Admins to manage digital roles
CREATE OR REPLACE FUNCTION public.ferex_guard_user_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(auth.role(),'') <> 'service_role' THEN
    -- If caller is Super Admin / Central Admin, permit all
    IF coalesce(public.ferex_role(),'') IN ('central','superadmin','super_admin') THEN
      RETURN NEW;
    END IF;

    -- If caller is Digital Admin, permit creating/updating digital team roles
    IF public.digital_is_admin() THEN
      IF NEW.role IN (
        'digital_admin','digital','ferex_digital','digital_director',
        'project_manager','digital_manager','pm','digimanager',
        'account_manager','accountmanager','digital_account_manager','account_executive','client_manager',
        'digital_staff','designer','developer','lead_developer','creative','digital_client'
      ) THEN
        RETURN NEW;
      END IF;
    END IF;

    -- Otherwise restrict role escalation
    IF TG_OP='INSERT' AND NEW.role <> 'student' THEN
      RAISE EXCEPTION 'Only authorized administrators can assign staff roles';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Account identity and role require an administrator';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 3. Synchronize all digital accounts from auth.users to public.users with their correct roles
DO $$
DECLARE
  rec record;
  v_role text;
  v_name text;
  v_dept text;
  v_phone text;
BEGIN
  FOR rec IN
    SELECT id, email, raw_user_meta_data, raw_app_meta_data
    FROM auth.users
  LOOP
    v_role := coalesce(
      nullif(rec.raw_app_meta_data->>'role',''),
      nullif(rec.raw_user_meta_data->>'role',''),
      CASE
        WHEN lower(rec.email) LIKE '%digimanager%' OR lower(rec.email) LIKE '%digitalmanager%' OR rec.email = 'dm@gmail.com' OR rec.email = 'dimanage@ferex.com' THEN 'project_manager'
        WHEN lower(rec.email) LIKE '%digitaladmin%' OR rec.email = 'digital@gmail.com' THEN 'digital_admin'
        WHEN lower(rec.email) LIKE '%account%' THEN 'account_manager'
        ELSE NULL
      END
    );

    IF v_role IS NOT NULL AND v_role IN (
      'digital_admin','digital','ferex_digital','digital_director',
      'project_manager','digital_manager','pm','digimanager',
      'account_manager','accountmanager','digital_account_manager','account_executive','client_manager',
      'digital_staff','designer','developer','lead_developer','creative',
      'superadmin','super_admin','central'
    ) THEN
      v_name := coalesce(
        nullif(rec.raw_user_meta_data->>'full_name',''),
        nullif(rec.raw_user_meta_data->>'name',''),
        split_part(rec.email, '@', 1)
      );
      v_dept := coalesce(nullif(rec.raw_user_meta_data->>'department',''), 'Digital Agency');
      v_phone := coalesce(rec.raw_user_meta_data->>'phone','');

      INSERT INTO public.users(id, email, full_name, role, department, phone, status, created_at, updated_at)
      VALUES(rec.id, rec.email, v_name, v_role, v_dept, v_phone, 'active', now(), now())
      ON CONFLICT(id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        department = EXCLUDED.department,
        status = 'active',
        updated_at = now();
    END IF;
  END LOOP;
END $$;

-- 4. Explicitly ensure dimanage@ferex.com, dm@gmail.com, ferexdigitalmanager@santoge.com have role 'project_manager'
UPDATE public.users
SET role = 'project_manager',
    status = 'active',
    full_name = CASE WHEN full_name = 'dimanage@ferex.com' THEN 'Digital Manager' ELSE full_name END,
    department = 'Digital Operations'
WHERE lower(email) IN ('dimanage@ferex.com', 'dm@gmail.com', 'ferexdigitalmanager@santoge.com', 'digimanager@santoge.com', 'digimanager2@santoge.com');

UPDATE public.users
SET role = 'digital_admin',
    status = 'active',
    department = 'Digital Agency HQ'
WHERE lower(email) IN ('digital@gmail.com', 'ferexdigitaladmin@gmail.com');

-- 5. Mark fake mock accounts as deleted so they never appear
UPDATE public.users
SET status = 'deleted'
WHERE lower(email) IN ('pm@ferex.com', 'digital@ferex.com', 'digimanager@ferex.com', 'creative@ferex.com', 'accounts@ferex.com');

COMMIT;

