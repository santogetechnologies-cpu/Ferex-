-- ============================================================================
-- Migration: 20261112160000_realtime_session_revocation_and_auth_guard.sql
-- Description: Real-time session revocation, token invalidation, replica identity,
--              and backend dynamic status & role verification.
-- ============================================================================

-- 1. Ensure full replica identity on public.users so real-time DELETE & UPDATE events
--    contain all column fields (id, email, role, is_active, status) in payload.old and payload.new
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 2. Update public.ferex_role() to validate user account status dynamically on every query.
--    If an account is deleted, inactive (is_active = false), or deactivated/suspended/deleted,
--    it returns NULL, instantly revoking all RLS permissions across all protected tables and APIs.
CREATE OR REPLACE FUNCTION public.ferex_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(role)
  FROM public.users
  WHERE id = auth.uid()
    AND COALESCE(is_active, true) = true
    AND COALESCE(status, 'active') NOT IN ('inactive', 'deactivated', 'deleted', 'suspended')
$$;

GRANT EXECUTE ON FUNCTION public.ferex_role() TO anon, authenticated, service_role;

-- 3. Helper function: check if a user is currently active and authorized
CREATE OR REPLACE FUNCTION public.is_active_user(check_user_id UUID DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = COALESCE(check_user_id, auth.uid())
      AND COALESCE(is_active, true) = true
      AND COALESCE(status, 'active') NOT IN ('inactive', 'deactivated', 'deleted', 'suspended')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user(UUID) TO anon, authenticated, service_role;

-- 4. Active user RLS guard on public.users:
--    Blocks deactivated or soft-deleted users from accessing or modifying user records.
DROP POLICY IF EXISTS ferex_users_active_only_guard ON public.users;
CREATE POLICY ferex_users_active_only_guard ON public.users AS RESTRICTIVE FOR ALL
USING (
  (id = auth.uid() AND COALESCE(is_active, true) = true AND COALESCE(status, 'active') NOT IN ('inactive', 'deactivated', 'deleted', 'suspended'))
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin')
  OR auth.role() = 'service_role'
);

-- 5. RPC function: set_user_status_by_admin
--    Enables Central Super Admin to activate, deactivate, or change user roles & permissions,
--    with immediate session token purging when an account is deactivated.
CREATE OR REPLACE FUNCTION public.set_user_status_by_admin(
  target_user_id UUID,
  new_is_active BOOLEAN DEFAULT NULL,
  new_status TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL,
  new_permissions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_role TEXT;
  v_target_email TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;

    v_caller_role := lower(COALESCE(public.ferex_role(), ''));
    IF v_caller_role NOT IN ('central', 'superadmin', 'super_admin') THEN
      SELECT role, email INTO v_target_role, v_target_email FROM public.users WHERE id = target_user_id;
      IF NOT (v_caller_role IN ('admin', 'education_admin', 'education') AND v_target_role = 'student') THEN
        RAISE EXCEPTION 'Unauthorized: Only Central Super Admins can modify account security status and roles';
      END IF;
    END IF;
  END IF;

  -- Protection for Super Admin root accounts
  SELECT email INTO v_target_email FROM public.users WHERE id = target_user_id;
  IF lower(COALESCE(v_target_email, '')) IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com') THEN
    IF new_is_active = false OR new_status IN ('inactive', 'deleted', 'suspended') THEN
      RAISE EXCEPTION 'Security restriction: Primary Super Admin account cannot be deactivated';
    END IF;
  END IF;

  -- Self-deactivation prevention
  IF v_caller_id IS NOT NULL AND v_caller_id = target_user_id AND (new_is_active = false OR new_status IN ('inactive', 'deleted', 'suspended')) THEN
    RAISE EXCEPTION 'Security restriction: You cannot deactivate your own active administrator account';
  END IF;

  -- Update public.users
  UPDATE public.users
  SET
    is_active = COALESCE(new_is_active, is_active),
    status = COALESCE(new_status, status),
    role = COALESCE(new_role, role),
    permissions = COALESCE(new_permissions, permissions),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- If deactivated or marked inactive/deleted, purge active auth sessions and refresh tokens immediately
  IF new_is_active = false OR new_status IN ('inactive', 'deactivated', 'deleted', 'suspended') THEN
    BEGIN
      DELETE FROM auth.sessions WHERE user_id = target_user_id;
      DELETE FROM auth.refresh_tokens WHERE session_id IN (
        SELECT id FROM auth.sessions WHERE user_id = target_user_id
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Sync role to auth.users metadata if role was changed
  IF new_role IS NOT NULL AND new_role <> '' THEN
    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
          raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
      WHERE id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'is_active', new_is_active,
    'status', new_status,
    'role', new_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_status_by_admin(UUID, BOOLEAN, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- 6. Ensure delete_user_by_admin invalidates and purges auth.sessions and auth.refresh_tokens
--    in addition to deleting from auth.users and public.users
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
  v_lead_id UUID;
  v_lead_email TEXT;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Resolve target user ID, email and role first
  IF target_user_id IS NOT NULL THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE id = target_user_id;

    IF v_user_id IS NULL THEN
      SELECT id, email, COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'student')
      INTO v_user_id, v_user_email, v_user_role
      FROM auth.users WHERE id = target_user_id;
    END IF;
  END IF;

  IF v_user_id IS NULL AND target_email IS NOT NULL AND TRIM(target_email) <> '' THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE lower(email) = lower(TRIM(target_email));

    IF v_user_id IS NULL THEN
      SELECT id, email, COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'student')
      INTO v_user_id, v_user_email, v_user_role
      FROM auth.users WHERE lower(email) = lower(TRIM(target_email));
    END IF;
  END IF;

  -- Also resolve from CRM leads (education_leads)
  SELECT id, email INTO v_lead_id, v_lead_email
  FROM public.education_leads
  WHERE (target_user_id IS NOT NULL AND (id = target_user_id OR converted_student_id = target_user_id))
     OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND lower(email) = lower(TRIM(target_email)))
     OR (v_user_id IS NOT NULL AND (id = v_user_id OR converted_student_id = v_user_id))
     OR (v_user_email IS NOT NULL AND v_user_email <> '' AND lower(email) = lower(v_user_email))
  LIMIT 1;

  IF v_user_role IS NULL AND v_lead_id IS NOT NULL THEN
    v_user_role := 'student';
    IF v_user_email IS NULL OR v_user_email = '' THEN
      v_user_email := COALESCE(v_lead_email, target_email);
    END IF;
  END IF;

  IF v_user_id IS NULL AND (v_user_email IS NULL OR v_user_email = '') AND v_lead_id IS NULL AND target_user_id IS NULL AND (target_email IS NULL OR TRIM(target_email) = '') THEN
    RAISE EXCEPTION 'A valid target_user_id or target_email must be provided';
  END IF;

  -- 2. Authorization check:
  --    - Central Super Admins can delete any non-root user
  --    - Education Admins can delete student accounts (role = 'student')
  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required to delete a user';
    END IF;

    v_caller_role := lower(COALESCE(public.ferex_role(), ''));

    IF v_caller_role IN ('central', 'superadmin', 'super_admin') THEN
      NULL;
    ELSIF v_caller_role IN ('admin', 'education_admin', 'education') THEN
      IF v_user_role IS NOT NULL AND v_user_role <> 'student' THEN
        RAISE EXCEPTION 'Unauthorized: Education Administrators can only delete student accounts';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized: You do not have permission to delete user accounts';
    END IF;
  END IF;

  -- If target not found anywhere in DB (users, auth, or leads), consider it already deleted
  IF v_user_id IS NULL AND (v_user_email IS NULL OR v_user_email = '') AND v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User does not exist or was already deleted',
      'user_id', target_user_id,
      'email', target_email
    );
  END IF;

  -- 3. Self-deletion prevention
  IF v_caller_id IS NOT NULL AND v_user_id IS NOT NULL AND v_caller_id = v_user_id THEN
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

    -- Nullify accounting transactions so historical ledger remains intact without FK error
    UPDATE public.payments SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.invoices SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.receipts SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.credit_notes SET student_id = NULL WHERE student_id = v_user_id;
  END IF;

  -- Delete student-specific operational records
  DELETE FROM public.applications 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.education_service_agreements 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.education_workflow_progress 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.education_student_preferences 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.education_student_fee_overrides 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.education_direct_payments 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.student_documents 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.student_payments 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.visa_applications 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.pre_departure_checklists 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.nawa_records 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.legalization_records 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.tasks 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.meetings 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.chat_conversations 
  WHERE (v_user_id IS NOT NULL AND student_id = v_user_id)
     OR (target_user_id IS NOT NULL AND student_id = target_user_id)
     OR (v_lead_id IS NOT NULL AND student_id = v_lead_id);

  DELETE FROM public.support_tickets 
  WHERE (v_user_id IS NOT NULL AND (student_id = v_user_id OR user_id = v_user_id))
     OR (target_user_id IS NOT NULL AND (student_id = target_user_id OR user_id = target_user_id))
     OR (v_lead_id IS NOT NULL AND (student_id = v_lead_id OR user_id = v_lead_id));

  -- 6. Unlink and archive corresponding education_leads record so getStudents() does not re-synthesize or resurrect the deleted student!
  UPDATE public.education_leads
  SET converted_student_id = NULL,
      status = CASE WHEN status = 'Enrolled' THEN 'Archived' ELSE status END,
      updated_at = NOW()
  WHERE (v_lead_id IS NOT NULL AND id = v_lead_id)
     OR (target_user_id IS NOT NULL AND (id = target_user_id OR converted_student_id = target_user_id))
     OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND lower(email) = lower(TRIM(target_email)))
     OR (v_user_id IS NOT NULL AND (id = v_user_id OR converted_student_id = v_user_id))
     OR (v_user_email IS NOT NULL AND v_user_email <> '' AND lower(email) = lower(v_user_email));

  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    UPDATE public.users 
    SET assigned_counselor = '' 
    WHERE assigned_counselor = v_user_email 
       OR (v_user_id IS NOT NULL AND assigned_counselor = (SELECT full_name FROM public.users WHERE id = v_user_id));
  END IF;

  -- 7. Invalidate and purge all active sessions and refresh tokens immediately
  BEGIN
    DELETE FROM auth.sessions 
    WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
       OR (target_user_id IS NOT NULL AND user_id = target_user_id);

    DELETE FROM auth.refresh_tokens 
    WHERE session_id IN (
      SELECT id FROM auth.sessions 
      WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
         OR (target_user_id IS NOT NULL AND user_id = target_user_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 8. Permanently delete from public.users
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  IF target_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = target_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM public.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 9. Permanently delete from auth.users (cascades sessions, identities, tokens)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
  IF target_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = target_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 10. Audit log the deletion
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
      COALESCE(v_caller_email, 'admin'),
      'DELETE_USER',
      COALESCE(v_user_role, 'user'),
      COALESCE(v_user_id::text, v_user_email),
      jsonb_build_object(
        'deleted_email', v_user_email,
        'deleted_role', v_user_role,
        'deleted_user_id', v_user_id,
        'deleted_by_role', v_caller_role
      ),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account permanently deleted and active sessions revoked',
    'user_id', v_user_id,
    'email', v_user_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID, TEXT) TO authenticated, service_role;

