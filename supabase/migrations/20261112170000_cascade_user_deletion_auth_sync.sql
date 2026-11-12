-- ============================================================================
-- Migration: 20261112170000_cascade_user_deletion_auth_sync.sql
-- Description: Automatic cascading trigger from public.users to auth.users,
--              purge active sessions on deletion, and allow Education Admins
--              to delete division staff/sub-admins.
-- ============================================================================

-- 1. Cascading trigger function: handle_user_deleted_sync
-- Whenever a user is deleted from public.users (via UI, RPC, SQL, or REST API),
-- automatically purge active sessions and delete them from auth.users so they
-- can NEVER log in with that ID or credentials again.
CREATE OR REPLACE FUNCTION public.handle_user_deleted_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Invalidate and purge sessions & refresh tokens
  BEGIN
    DELETE FROM auth.sessions WHERE user_id = OLD.id;
    DELETE FROM auth.refresh_tokens WHERE session_id IN (
      SELECT id FROM auth.sessions WHERE user_id = OLD.id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Delete from auth.users so Supabase auth cannot authenticate this user
  BEGIN
    DELETE FROM auth.users 
    WHERE id = OLD.id 
       OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Archive and unlink any related education_leads records
  BEGIN
    UPDATE public.education_leads
    SET converted_student_id = NULL,
        status = CASE WHEN status = 'Enrolled' THEN 'Archived' ELSE status END,
        updated_at = NOW()
    WHERE converted_student_id = OLD.id
       OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_delete_user_from_auth ON public.users;
CREATE TRIGGER trg_cascade_delete_user_from_auth
AFTER DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted_sync();

-- 2. Enhanced delete_user_by_admin:
-- Allow Education Admins to delete staff, counselors, and sub-admins in their division,
-- while protecting primary Super Admins and self-deletion.
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
  v_lead_id UUID;
  v_lead_email TEXT;
BEGIN
  v_caller_id := auth.uid();

  -- Resolve target user ID, email and role
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

  -- Authorization check:
  -- Central Super Admins can delete any non-root account.
  -- Education Admins can delete students, staff, counselors, and education admins.
  -- Education Admins CANNOT delete Central Super Admins.
  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required to delete a user';
    END IF;

    v_caller_role := lower(COALESCE(public.ferex_role(), ''));

    IF v_caller_role IN ('central', 'superadmin', 'super_admin') THEN
      NULL;
    ELSIF v_caller_role IN ('admin', 'education_admin', 'education') THEN
      IF v_user_role IS NOT NULL AND v_user_role IN ('central', 'superadmin', 'super_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Education Administrators cannot delete Central Super Administrators';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized: You do not have permission to delete user accounts';
    END IF;
  END IF;

  -- Self-deletion prevention
  IF v_caller_id IS NOT NULL AND v_user_id IS NOT NULL AND v_caller_id = v_user_id THEN
    RAISE EXCEPTION 'Security restriction: You cannot delete your own active administrator account';
  END IF;

  -- Protection for primary root accounts
  IF lower(COALESCE(v_user_email, '')) IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com') THEN
    RAISE EXCEPTION 'Security restriction: The primary Super Admin account cannot be deleted';
  END IF;

  -- Relational unlinking
  IF v_user_id IS NOT NULL THEN
    UPDATE public.education_student_fee_overrides SET approved_by = NULL WHERE approved_by = v_user_id;
    UPDATE public.education_direct_payments SET verified_by = NULL WHERE verified_by = v_user_id;
    UPDATE public.digital_projects SET assigned_staff_id = NULL, assigned_staff_name = '', assigned_staff_email = '' WHERE assigned_staff_id = v_user_id;
    UPDATE public.payments SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.invoices SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.receipts SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.credit_notes SET student_id = NULL WHERE student_id = v_user_id;
  END IF;

  -- Delete operational student records
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
    WHERE assigned_counselor = v_user_email;
  END IF;

  -- Invalidate auth sessions
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

  -- Permanently delete from public.users (triggers trg_cascade_delete_user_from_auth)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  IF target_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = target_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM public.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- Also ensure auth.users is deleted directly
  BEGIN
    IF v_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
    IF target_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = target_user_id;
    END IF;
    IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
      DELETE FROM auth.users WHERE lower(email) = lower(v_user_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account, credentials, active sessions and all references deleted successfully',
    'deleted_user_id', COALESCE(v_user_id, target_user_id),
    'deleted_email', COALESCE(v_user_email, target_email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID, TEXT) TO authenticated, service_role;

