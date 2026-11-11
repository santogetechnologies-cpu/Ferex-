-- ============================================================================
-- Migration: 20261111160000_secure_user_deletion_and_integrity.sql
-- Description: Adds secure user deletion RPC, fixes foreign key delete actions,
--              and cleans up stale deleted account records.
-- ============================================================================

-- 1. Ensure foreign key constraints on approvals / verifications use ON DELETE SET NULL
--    so deleting a staff/admin user never deletes or breaks financial / audit records
ALTER TABLE public.education_student_fee_overrides
  DROP CONSTRAINT IF EXISTS education_student_fee_overrides_approved_by_fkey;

ALTER TABLE public.education_student_fee_overrides
  ADD CONSTRAINT education_student_fee_overrides_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.education_direct_payments
  DROP CONSTRAINT IF EXISTS education_direct_payments_verified_by_fkey;

ALTER TABLE public.education_direct_payments
  ADD CONSTRAINT education_direct_payments_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Nullify references and purge legacy records previously marked status = 'deleted'
UPDATE public.education_student_fee_overrides
SET approved_by = NULL
WHERE approved_by IN (SELECT id FROM public.users WHERE status = 'deleted');

UPDATE public.education_direct_payments
SET verified_by = NULL
WHERE verified_by IN (SELECT id FROM public.users WHERE status = 'deleted');

UPDATE public.digital_projects
SET assigned_staff_id = NULL, assigned_staff_name = '', assigned_staff_email = ''
WHERE assigned_staff_id IN (SELECT id FROM public.users WHERE status = 'deleted');

-- Purge auth.users for rows previously marked deleted
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.users WHERE status = 'deleted')
   OR lower(email) IN (SELECT lower(email) FROM public.users WHERE status = 'deleted');

-- Purge public.users
DELETE FROM public.users WHERE status = 'deleted';

-- 3. Create public.delete_user_by_admin RPC function
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(
  target_user_id UUID DEFAULT NULL,
  target_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_caller_email TEXT;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Authorization: Only Central Super Admin or service_role can delete users
  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required to delete a user';
    END IF;

    v_caller_role := lower(COALESCE(public.ferex_role(), ''));
    IF v_caller_role NOT IN ('central', 'superadmin', 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only Central Super Admins have permission to delete users';
    END IF;
  END IF;

  -- 2. Resolve target user ID and email
  IF target_user_id IS NOT NULL THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE id = target_user_id;

    IF v_user_id IS NULL THEN
      SELECT id, email INTO v_user_id, v_user_email
      FROM auth.users WHERE id = target_user_id;
    END IF;
  ELSIF target_email IS NOT NULL AND TRIM(target_email) <> '' THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE lower(email) = lower(TRIM(target_email));

    IF v_user_id IS NULL THEN
      SELECT id, email INTO v_user_id, v_user_email
      FROM auth.users WHERE lower(email) = lower(TRIM(target_email));
    END IF;
  ELSE
    RAISE EXCEPTION 'A valid target_user_id or target_email must be provided';
  END IF;

  -- If target not found anywhere in DB, consider it already deleted
  IF v_user_id IS NULL AND (v_user_email IS NULL OR v_user_email = '') THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User does not exist or was already deleted',
      'user_id', target_user_id,
      'email', target_email
    );
  END IF;

  -- 3. Self-deletion prevention
  IF v_caller_id IS NOT NULL AND v_caller_id = v_user_id THEN
    RAISE EXCEPTION 'Security restriction: You cannot delete your own active administrator account';
  END IF;

  -- 4. Protection for primary root accounts
  IF lower(COALESCE(v_user_email, '')) IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com') THEN
    RAISE EXCEPTION 'Security restriction: The primary Super Admin account cannot be deleted';
  END IF;

  -- 5. Safe Foreign-Key & Reference Unlinking (Preserves business records)
  IF v_user_id IS NOT NULL THEN
    UPDATE public.education_student_fee_overrides 
    SET approved_by = NULL 
    WHERE approved_by = v_user_id;

    UPDATE public.education_direct_payments 
    SET verified_by = NULL 
    WHERE verified_by = v_user_id;

    UPDATE public.digital_projects 
    SET assigned_staff_id = NULL,
        assigned_staff_name = '',
        assigned_staff_email = ''
    WHERE assigned_staff_id = v_user_id;
  END IF;

  -- Clear counselor assignment string if student is assigned to this staff
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    UPDATE public.users 
    SET assigned_counselor = '' 
    WHERE assigned_counselor = v_user_email 
       OR (v_user_id IS NOT NULL AND assigned_counselor = (SELECT full_name FROM public.users WHERE id = v_user_id));
  END IF;

  -- 6. Permanently delete from public.users
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM public.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 7. Permanently delete from auth.users (cascades sessions, identities, tokens)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 8. Audit log the deletion
  BEGIN
    SELECT email INTO v_caller_email FROM public.users WHERE id = v_caller_id;
    INSERT INTO public.central_audit_logs (
      id,
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      details,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_caller_id,
      COALESCE(v_caller_email, 'central_admin'),
      'DELETE_USER',
      'user',
      COALESCE(v_user_id::text, v_user_email),
      jsonb_build_object(
        'deleted_email', v_user_email,
        'deleted_role', v_user_role,
        'deleted_user_id', v_user_id
      ),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never abort deletion transaction if audit log insert encounters issue
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account permanently deleted from authentication and directory',
    'user_id', v_user_id,
    'email', v_user_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID, TEXT) TO authenticated, service_role;

