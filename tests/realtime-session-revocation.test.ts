import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();

const superAdminId = '10000000-0000-4000-8000-000000000099';
const eduAdminId   = '10000000-0000-4000-8000-000000000003';
const counselorId  = '10000000-0000-4000-8000-000000000004';
const adminToDeleteId = '10000000-0000-4000-8000-000000000005';
const studentId1   = '10000000-0000-4000-8000-000000000001';
const studentId2   = '10000000-0000-4000-8000-000000000002';
const unaffStudentId = '10000000-0000-4000-8000-000000000088';

const asUser = async (id: string, role = 'authenticated') => {
  await db.exec(`
    RESET ROLE;
    SELECT set_config('request.jwt.claim.sub', '${id}', false),
           set_config('request.jwt.claim.role', '${role}', false);
    SET ROLE ${role};
  `);
};

const asServiceRole = async () => {
  await db.exec(`
    RESET ROLE;
    SELECT set_config('request.jwt.claim.sub', '', false),
           set_config('request.jwt.claim.role', 'service_role', false);
    SET ROLE service_role;
  `);
};

before(async () => {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    DO $$ BEGIN
      CREATE ROLE authenticated;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE ROLE anon;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE ROLE service_role;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT current_setting('request.jwt.claim.role', true)
    $$;

    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY,
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS auth.sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
      id bigserial PRIMARY KEY,
      session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE,
      token text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY,
      email text,
      full_name text,
      role text,
      status text DEFAULT 'active',
      is_active boolean DEFAULT true,
      permissions jsonb DEFAULT '{}'::jsonb,
      department text,
      phone text,
      assigned_counselor text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Dynamic role function checking active status
    CREATE OR REPLACE FUNCTION public.ferex_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$
      SELECT lower(role)
      FROM public.users
      WHERE id = auth.uid()
        AND COALESCE(is_active, true) = true
        AND COALESCE(status, 'active') NOT IN ('inactive', 'deactivated', 'deleted', 'suspended')
    $$;

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

    -- Operational test tables
    CREATE TABLE IF NOT EXISTS public.applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      student_name text,
      university_name text,
      course text,
      status text
    );

    CREATE TABLE IF NOT EXISTS public.education_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      email text,
      status text,
      converted_student_id uuid,
      updated_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.education_service_agreements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      agreement_code text
    );

    CREATE TABLE IF NOT EXISTS public.education_workflow_progress (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      step text
    );

    CREATE TABLE IF NOT EXISTS public.education_student_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      target_country text
    );

    CREATE TABLE IF NOT EXISTS public.education_student_fee_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      approved_by uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.education_direct_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      verified_by uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.student_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      doc_name text
    );

    CREATE TABLE IF NOT EXISTS public.student_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.visa_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      status text
    );

    CREATE TABLE IF NOT EXISTS public.pre_departure_checklists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.nawa_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.legalization_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.meetings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.chat_conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.support_tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      user_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.digital_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assigned_staff_id uuid,
      assigned_staff_name text,
      assigned_staff_email text
    );

    CREATE TABLE IF NOT EXISTS public.payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      amount numeric
    );

    CREATE TABLE IF NOT EXISTS public.credit_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      amount numeric
    );

    -- Protected table for RLS verification
    CREATE TABLE IF NOT EXISTS public.confidential_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text,
      level text
    );

    ALTER TABLE public.confidential_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS rls_confidential_records ON public.confidential_records;
    CREATE POLICY rls_confidential_records ON public.confidential_records
      FOR SELECT TO authenticated
      USING (
        public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'education_admin', 'counselor')
        AND public.is_active_user() = true
      );

    -- Define set_user_status_by_admin
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
    AS $func$
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

      SELECT email INTO v_target_email FROM public.users WHERE id = target_user_id;
      IF lower(COALESCE(v_target_email, '')) IN ('superadmin@ferexventures.com', 'centraladmin@ferexventures.com') THEN
        IF new_is_active = false OR new_status IN ('inactive', 'deleted', 'suspended') THEN
          RAISE EXCEPTION 'Security restriction: Primary Super Admin account cannot be deactivated';
        END IF;
      END IF;

      IF v_caller_id IS NOT NULL AND v_caller_id = target_user_id AND (new_is_active = false OR new_status IN ('inactive', 'deleted', 'suspended')) THEN
        RAISE EXCEPTION 'Security restriction: You cannot deactivate your own active administrator account';
      END IF;

      UPDATE public.users
      SET
        is_active = COALESCE(new_is_active, is_active),
        status = COALESCE(new_status, status),
        role = COALESCE(new_role, role),
        permissions = COALESCE(new_permissions, permissions),
        updated_at = NOW()
      WHERE id = target_user_id;

      IF new_is_active = false OR new_status IN ('inactive', 'deactivated', 'deleted', 'suspended') THEN
        DELETE FROM auth.sessions WHERE user_id = target_user_id;
        DELETE FROM auth.refresh_tokens WHERE session_id IN (
          SELECT id FROM auth.sessions WHERE user_id = target_user_id
        );
      END IF;

      IF new_role IS NOT NULL AND new_role <> '' THEN
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
            raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
        WHERE id = target_user_id;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'is_active', new_is_active,
        'status', new_status,
        'role', new_role
      );
    END;
    $func$;

    -- Define delete_user_by_admin
    CREATE OR REPLACE FUNCTION public.delete_user_by_admin(
      target_user_id UUID DEFAULT NULL,
      target_email TEXT DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $func$
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

      IF v_caller_id IS NOT NULL AND v_user_id IS NOT NULL AND v_caller_id = v_user_id THEN
        RAISE EXCEPTION 'Security restriction: You cannot delete your own active administrator account';
      END IF;

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

      -- Invalidate sessions & refresh tokens
      DELETE FROM auth.sessions 
      WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
         OR (target_user_id IS NOT NULL AND user_id = target_user_id);

      DELETE FROM auth.refresh_tokens 
      WHERE session_id IN (
        SELECT id FROM auth.sessions 
        WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
           OR (target_user_id IS NOT NULL AND user_id = target_user_id)
      );

      IF v_user_id IS NOT NULL THEN
        DELETE FROM public.users WHERE id = v_user_id;
      END IF;
      IF target_user_id IS NOT NULL THEN
        DELETE FROM public.users WHERE id = target_user_id;
      END IF;
      IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
        DELETE FROM public.users WHERE lower(email) = lower(v_user_email);
      END IF;

      IF v_user_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_user_id;
      END IF;
      IF target_user_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = target_user_id;
      END IF;
      IF v_user_email IS NOT NULL AND v_user_email <> '' THEN
        DELETE FROM auth.users WHERE lower(email) = lower(v_user_email);
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'User account, credentials, active sessions and all references deleted successfully',
        'deleted_user_id', COALESCE(v_user_id, target_user_id),
        'deleted_email', COALESCE(v_user_email, target_email)
      );
    END;
    $func$;

    GRANT ALL ON SCHEMA public, auth TO service_role, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public, auth TO service_role, authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public, auth TO service_role, authenticated;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth TO authenticated, anon, service_role;
  `);

  // Seed baseline users & sessions
  await db.exec('RESET ROLE;');

  // 1. Super Admin
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [superAdminId, 'superadmin@ferexventures.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Super Admin', 'super_admin', 'active', true);`, [superAdminId, 'superadmin@ferexventures.com']);

  // 2. Education Admin
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [eduAdminId, 'eduadmin@ferexventures.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Education Admin', 'education_admin', 'active', true);`, [eduAdminId, 'eduadmin@ferexventures.com']);

  // 3. Counselor / Sub-admin
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [counselorId, 'counselor@ferexventures.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Counselor User', 'counselor', 'active', true);`, [counselorId, 'counselor@ferexventures.com']);

  // 4. Admin to delete
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [adminToDeleteId, 'targetadmin@ferexventures.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Target Admin', 'admin', 'active', true);`, [adminToDeleteId, 'targetadmin@ferexventures.com']);
  await db.query(`INSERT INTO auth.sessions (id, user_id) VALUES ('50000000-0000-4000-8000-000000000001', $1);`, [adminToDeleteId]);
  await db.query(`INSERT INTO auth.refresh_tokens (session_id, token) VALUES ('50000000-0000-4000-8000-000000000001', 'token_admin_to_delete');`);

  // 5. Student 1 to delete
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [studentId1, 'student1@gmail.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Student One', 'student', 'active', true);`, [studentId1, 'student1@gmail.com']);
  await db.query(`INSERT INTO auth.sessions (id, user_id) VALUES ('50000000-0000-4000-8000-000000000002', $1);`, [studentId1]);
  await db.query(`INSERT INTO auth.refresh_tokens (session_id, token) VALUES ('50000000-0000-4000-8000-000000000002', 'token_student_1');`);
  await db.query(`INSERT INTO public.applications (student_id, student_name, university_name) VALUES ($1, 'Student One', 'Oxford');`, [studentId1]);

  // 6. Unaffected student
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2);`, [unaffStudentId, 'unaffected@gmail.com']);
  await db.query(`INSERT INTO public.users (id, email, full_name, role, status, is_active) VALUES ($1, $2, 'Unaffected Student', 'student', 'active', true);`, [unaffStudentId, 'unaffected@gmail.com']);
  await db.query(`INSERT INTO auth.sessions (id, user_id) VALUES ('50000000-0000-4000-8000-000000000003', $1);`, [unaffStudentId]);

  // Insert confidential records for RLS testing
  await db.query(`
    INSERT INTO public.confidential_records (title, level) VALUES
    ('Internal Operations Strategy', 'restricted'),
    ('Financial Quarterly Report', 'confidential');
  `);
});

after(async () => {
  await db.close();
});

test('1. Central Super Admin can delete an active admin account, purging sessions and invalidating role', async () => {
  // Verify adminToDelete is currently active with valid role & session
  await asUser(adminToDeleteId);
  const beforeRole = await db.query(`SELECT public.ferex_role() as role;`);
  assert.equal(beforeRole.rows[0].role, 'admin');

  const beforeSessions = await db.query(`SELECT count(*)::int as count FROM auth.sessions WHERE user_id = $1;`, [adminToDeleteId]);
  assert.equal(beforeSessions.rows[0].count, 1);

  // Central Super Admin executes deletion
  await asUser(superAdminId);
  const result = await db.query(`SELECT public.delete_user_by_admin($1) as res;`, [adminToDeleteId]);
  const resData = result.rows[0].res;
  assert.equal(resData.success, true);

  // Check public.users and auth.users
  const userCheck = await db.query(`SELECT count(*)::int as count FROM public.users WHERE id = $1;`, [adminToDeleteId]);
  assert.equal(userCheck.rows[0].count, 0);

  const authUserCheck = await db.query(`SELECT count(*)::int as count FROM auth.users WHERE id = $1;`, [adminToDeleteId]);
  assert.equal(authUserCheck.rows[0].count, 0);

  // Check sessions are purged
  const sessionCheck = await db.query(`SELECT count(*)::int as count FROM auth.sessions WHERE user_id = $1;`, [adminToDeleteId]);
  assert.equal(sessionCheck.rows[0].count, 0);

  // Check deleted user's previous JWT context now yields NULL role and cannot read confidential records
  await asUser(adminToDeleteId);
  const afterRole = await db.query(`SELECT public.ferex_role() as role;`);
  assert.equal(afterRole.rows[0].role, null);

  const confidentialQuery = await db.query(`SELECT * FROM public.confidential_records;`);
  assert.equal(confidentialQuery.rows.length, 0);
});

test('2. Education Admin deletes a student, cleaning up records and purging sessions', async () => {
  // Student 1 has 1 application and 1 session
  const appsBefore = await db.query(`SELECT count(*)::int as count FROM public.applications WHERE student_id = $1;`, [studentId1]);
  assert.equal(appsBefore.rows[0].count, 1);

  // Education Admin invokes delete_user_by_admin
  await asUser(eduAdminId);
  const result = await db.query(`SELECT public.delete_user_by_admin($1) as res;`, [studentId1]);
  assert.equal(result.rows[0].res.success, true);

  // Student deleted from public.users & auth.users
  const sUsers = await db.query(`SELECT count(*)::int as count FROM public.users WHERE id = $1;`, [studentId1]);
  assert.equal(sUsers.rows[0].count, 0);

  // Applications cleaned up
  const appsAfter = await db.query(`SELECT count(*)::int as count FROM public.applications WHERE student_id = $1;`, [studentId1]);
  assert.equal(appsAfter.rows[0].count, 0);

  // Sessions purged
  const sSessions = await db.query(`SELECT count(*)::int as count FROM auth.sessions WHERE user_id = $1;`, [studentId1]);
  assert.equal(sSessions.rows[0].count, 0);
});

test('3. Education Admin CANNOT delete another admin or counselor account', async () => {
  await asUser(eduAdminId);
  await assert.rejects(
    async () => {
      await db.query(`SELECT public.delete_user_by_admin($1);`, [counselorId]);
    },
    (err: Error) => {
      return err.message.includes('Education Administrators can only delete student accounts');
    }
  );
});

test('4. Central Admin deactivates an active user: role immediately returns NULL and RLS access is revoked', async () => {
  // Counselor is active initially
  await asUser(counselorId);
  const initialRole = await db.query(`SELECT public.ferex_role() as role, public.is_active_user() as is_act;`);
  assert.equal(initialRole.rows[0].role, 'counselor');
  assert.equal(initialRole.rows[0].is_act, true);

  // Counselor can query confidential records
  const records = await db.query(`SELECT count(*)::int as count FROM public.confidential_records;`);
  assert.equal(records.rows[0].count, 2);

  // Super Admin deactivates counselor
  await asUser(superAdminId);
  await db.query(`SELECT public.set_user_status_by_admin($1, false, 'deactivated');`, [counselorId]);

  // Check public.users record
  const u = await db.query(`SELECT is_active, status FROM public.users WHERE id = $1;`, [counselorId]);
  assert.equal(u.rows[0].is_active, false);
  assert.equal(u.rows[0].status, 'deactivated');

  // Active session as counselor now immediately evaluates to NULL role
  await asUser(counselorId);
  const deactivatedRole = await db.query(`SELECT public.ferex_role() as role, public.is_active_user() as is_act;`);
  assert.equal(deactivatedRole.rows[0].role, null);
  assert.equal(deactivatedRole.rows[0].is_act, false);

  // Confidential records query under RLS returns 0 records
  const emptyRecords = await db.query(`SELECT * FROM public.confidential_records;`);
  assert.equal(emptyRecords.rows.length, 0);
});

test('5. Central Admin reactivates and updates user role; new role is immediately reflected', async () => {
  // Central Admin reactivates and elevates counselor to 'education_admin'
  await asUser(superAdminId);
  await db.query(`SELECT public.set_user_status_by_admin($1, true, 'active', 'education_admin');`, [counselorId]);

  // Counselor immediately has 'education_admin' role without re-authenticating
  await asUser(counselorId);
  const elevatedRole = await db.query(`SELECT public.ferex_role() as role, public.is_active_user() as is_act;`);
  assert.equal(elevatedRole.rows[0].role, 'education_admin');
  assert.equal(elevatedRole.rows[0].is_act, true);

  // Confidential records query works again
  const records = await db.query(`SELECT count(*)::int as count FROM public.confidential_records;`);
  assert.equal(records.rows[0].count, 2);
});

test('6. User permissions can be updated dynamically via set_user_status_by_admin', async () => {
  await asUser(superAdminId);
  const updatedPerms = { can_delete: false, can_export: true, custom_grant: 'audit_reader' };
  await db.query(`SELECT public.set_user_status_by_admin($1, NULL, NULL, NULL, $2::jsonb);`, [counselorId, JSON.stringify(updatedPerms)]);

  const u = await db.query(`SELECT permissions FROM public.users WHERE id = $1;`, [counselorId]);
  assert.deepEqual(u.rows[0].permissions, updatedPerms);
});

test('7. Unaffected active users retain intact sessions, roles, and access', async () => {
  await asUser(unaffStudentId);
  const studentRole = await db.query(`SELECT public.ferex_role() as role, public.is_active_user() as is_act;`);
  assert.equal(studentRole.rows[0].role, 'student');
  assert.equal(studentRole.rows[0].is_act, true);

  const studentSessions = await db.query(`SELECT count(*)::int as count FROM auth.sessions WHERE user_id = $1;`, [unaffStudentId]);
  assert.equal(studentSessions.rows[0].count, 1);

  // Education Admin is also unaffected
  await asUser(eduAdminId);
  const eduRole = await db.query(`SELECT public.ferex_role() as role;`);
  assert.equal(eduRole.rows[0].role, 'education_admin');
});

test('8. Root security restrictions: Self-deletion and primary superadmin deletion are blocked', async () => {
  await asUser(superAdminId);
  // Attempt self-deletion
  await assert.rejects(
    async () => {
      await db.query(`SELECT public.delete_user_by_admin($1);`, [superAdminId]);
    },
    (err: Error) => err.message.includes('You cannot delete your own active administrator account')
  );

  // Attempt deactivating primary super admin
  await assert.rejects(
    async () => {
      await db.query(`SELECT public.set_user_status_by_admin($1, false, 'deactivated');`, [superAdminId]);
    },
    (err: Error) => err.message.includes('Primary Super Admin account cannot be deactivated')
  );
});
