-- ============================================================================
-- Migration: 20261111170000_student_deletion_and_roster_integrity.sql
-- Description: Enables Education Admins to delete students with full cascade,
--              updates RLS delete policy, unlinks education_leads, and purges auth.users.
-- ============================================================================

-- 1. Update public.users RLS DELETE policy to authorize Education Admins for students
DROP POLICY IF EXISTS "ferex_users_admin_delete_policy" ON public.users;
CREATE POLICY "ferex_users_admin_delete_policy" ON public.users
  FOR DELETE TO authenticated
  USING (
    public.ferex_role() IN ('central', 'superadmin', 'super_admin')
    OR (public.ferex_role() IN ('admin', 'education_admin', 'education') AND role = 'student')
    OR auth.role() = 'service_role'
  );

-- 2. Update delete_user_by_admin function to support student deletion by Education Admins
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

  -- 1. Resolve target user ID, email and role first
  IF target_user_id IS NOT NULL THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE id = target_user_id;

    IF v_user_id IS NULL THEN
      SELECT id, email, COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'student')
      INTO v_user_id, v_user_email, v_user_role
      FROM auth.users WHERE id = target_user_id;
    END IF;
  ELSIF target_email IS NOT NULL AND TRIM(target_email) <> '' THEN
    SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
    FROM public.users WHERE lower(email) = lower(TRIM(target_email));

    IF v_user_id IS NULL THEN
      SELECT id, email, COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'student')
      INTO v_user_id, v_user_email, v_user_role
      FROM auth.users WHERE lower(email) = lower(TRIM(target_email));
    END IF;
  ELSE
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
      -- Central Super Admin has full account deletion permission
      NULL;
    ELSIF v_caller_role IN ('admin', 'education_admin', 'education') THEN
      -- Education Admin can strictly only delete student accounts
      IF v_user_role IS NOT NULL AND v_user_role <> 'student' THEN
        RAISE EXCEPTION 'Unauthorized: Education Administrators can only delete student accounts';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized: You do not have permission to delete user accounts';
    END IF;
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

    -- Nullify accounting transactions so historical ledger remains intact without FK error
    UPDATE public.payments SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.invoices SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.receipts SET student_id = NULL WHERE student_id = v_user_id;
    UPDATE public.credit_notes SET student_id = NULL WHERE student_id = v_user_id;

    -- Delete student-specific operational records
    DELETE FROM public.applications WHERE student_id = v_user_id;
    DELETE FROM public.education_service_agreements WHERE student_id = v_user_id;
    DELETE FROM public.education_workflow_progress WHERE student_id = v_user_id;
    DELETE FROM public.education_student_preferences WHERE student_id = v_user_id;
    DELETE FROM public.education_student_fee_overrides WHERE student_id = v_user_id;
    DELETE FROM public.education_direct_payments WHERE student_id = v_user_id;
    DELETE FROM public.student_documents WHERE student_id = v_user_id;
    DELETE FROM public.student_payments WHERE student_id = v_user_id;
    DELETE FROM public.visa_applications WHERE student_id = v_user_id;
    DELETE FROM public.pre_departure_checklists WHERE student_id = v_user_id;
    DELETE FROM public.nawa_records WHERE student_id = v_user_id;
    DELETE FROM public.legalization_records WHERE student_id = v_user_id;
    DELETE FROM public.tasks WHERE student_id = v_user_id;
    DELETE FROM public.meetings WHERE student_id = v_user_id;
    DELETE FROM public.chat_conversations WHERE student_id = v_user_id;
    DELETE FROM public.support_tickets WHERE student_id = v_user_id OR user_id = v_user_id;
  END IF;

  -- 6. Unlink and archive corresponding education_leads record so getStudents() does not re-synthesize or resurrect the deleted student!
  IF v_user_id IS NOT NULL THEN
    UPDATE public.education_leads
    SET converted_student_id = NULL,
        status = CASE WHEN status = 'Enrolled' THEN 'Archived' ELSE status END,
        updated_at = NOW()
    WHERE converted_student_id = v_user_id;
  END IF;

  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    UPDATE public.education_leads
    SET converted_student_id = NULL,
        status = CASE WHEN status = 'Enrolled' THEN 'Archived' ELSE status END,
        updated_at = NOW()
    WHERE lower(email) = lower(v_user_email);

    -- Clear counselor assignment string if student is assigned to this staff
    UPDATE public.users 
    SET assigned_counselor = '' 
    WHERE assigned_counselor = v_user_email 
       OR (v_user_id IS NOT NULL AND assigned_counselor = (SELECT full_name FROM public.users WHERE id = v_user_id));
  END IF;

  -- 7. Permanently delete from public.users
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM public.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 8. Permanently delete from auth.users (cascades sessions, identities, tokens)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
  IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(v_user_email);
  END IF;

  -- 9. Audit log the deletion
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
      'student',
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
    'message', 'Student record permanently deleted from authentication and directory',
    'user_id', v_user_id,
    'email', v_user_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID, TEXT) TO authenticated, service_role;

