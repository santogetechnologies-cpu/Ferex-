-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Privileged Bootstrap Correction for admin@ferex.com
-- ─────────────────────────────────────────────────────────────────────────────
-- Corrects the initial bootstrap administrator account in public.users
-- to role = 'admin' and immediately re-enables the trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Temporarily disable trigger for this bootstrap transaction
ALTER TABLE public.users DISABLE TRIGGER trg_prevent_role_escalation;

DO $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- 2. Find matching auth.users id for admin@ferex.com
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('admin@ferex.com')
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    -- If public.users row exists with auth user ID, update role in place:
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_auth_user_id) THEN
      UPDATE public.users
      SET role = 'admin',
          full_name = COALESCE(NULLIF(full_name, ''), 'Administrator'),
          updated_at = NOW()
      WHERE id = v_auth_user_id;

    -- If public.users row exists with different UUID, unify to auth user ID:
    ELSIF EXISTS (SELECT 1 FROM public.users WHERE LOWER(email) = LOWER('admin@ferex.com')) THEN
      UPDATE public.users
      SET id = v_auth_user_id,
          role = 'admin',
          full_name = COALESCE(NULLIF(full_name, ''), 'Administrator'),
          updated_at = NOW()
      WHERE LOWER(email) = LOWER('admin@ferex.com');

    -- If absent in public.users, insert matching record:
    ELSE
      INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
      VALUES (v_auth_user_id, 'admin@ferex.com', 'Administrator', 'admin', NOW(), NOW());
    END IF;

    -- Sync auth.users user_metadata role
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    WHERE id = v_auth_user_id;

  ELSE
    -- Fallback if auth.users record is created later, ensure public.users has role = 'admin'
    UPDATE public.users
    SET role = 'admin',
        updated_at = NOW()
    WHERE LOWER(email) = LOWER('admin@ferex.com');
  END IF;
END $$;

-- 3. Re-enable security trigger immediately
ALTER TABLE public.users ENABLE TRIGGER trg_prevent_role_escalation;

-- Drop any previous RPC helper to guarantee zero client-side privilege exposure
DROP FUNCTION IF EXISTS public.bootstrap_admin_account();

