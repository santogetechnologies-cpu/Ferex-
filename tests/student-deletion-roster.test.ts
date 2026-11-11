import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const superAdminId = '10000000-0000-4000-8000-000000000099';
const eduAdminId = '10000000-0000-4000-8000-000000000003';
const counselorId = '10000000-0000-4000-8000-000000000004';
const studentId1 = '10000000-0000-4000-8000-000000000001';
const studentId2 = '10000000-0000-4000-8000-000000000002';
const db = new PGlite();

const asUser = async (id: string) => {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false), set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`);
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
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT current_setting('request.jwt.claim.role',true)
    $$;

    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY,
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      raw_app_meta_data jsonb DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY,
      email text,
      full_name text,
      role text,
      target_country text,
      destination_country text,
      country text,
      status text DEFAULT 'active',
      is_active boolean DEFAULT true,
      department text,
      phone text,
      assigned_counselor text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.ferex_role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT role FROM public.users WHERE id = auth.uid()
    $$;

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
      phone text,
      status text,
      preferred_country text,
      converted_student_id uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.education_service_agreements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.student_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.student_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.education_student_fee_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      approved_by uuid
    );

    CREATE TABLE IF NOT EXISTS public.education_direct_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid,
      verified_by uuid
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
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.credit_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.education_workflow_progress (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.education_student_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
    );

    CREATE TABLE IF NOT EXISTS public.visa_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid
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

    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO authenticated;
  `);

  // Load migration logic
  await db.exec(readFileSync('supabase/migrations/20261111170000_student_deletion_and_roster_integrity.sql', 'utf8'));

  // Seed users
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${superAdminId}', 'centraladmin@ferexventures.com'),
      ('${eduAdminId}', 'eduadmin@ferexedu.com'),
      ('${counselorId}', 'counselor@ferexedu.com'),
      ('${studentId1}', 'student1@ferexstudent.org'),
      ('${studentId2}', 'student2@ferexstudent.org');

    INSERT INTO public.users (id, email, full_name, role, target_country, country) VALUES
      ('${superAdminId}', 'centraladmin@ferexventures.com', 'Super Admin', 'super_admin', 'Global', 'Global'),
      ('${eduAdminId}', 'eduadmin@ferexedu.com', 'Education Admin', 'education_admin', 'Global', 'Global'),
      ('${counselorId}', 'counselor@ferexedu.com', 'Admissions Counselor', 'counselor', 'Poland', 'Poland'),
      ('${studentId1}', 'student1@ferexstudent.org', 'Alice Student', 'student', 'Germany', 'Germany'),
      ('${studentId2}', 'student2@ferexstudent.org', 'Bob Student', 'student', 'Poland', 'Poland');

    INSERT INTO public.applications (student_id, student_name, university_name, status) VALUES
      ('${studentId1}', 'Alice Student', 'TUM', 'Enrolled');

    INSERT INTO public.education_leads (name, email, status, converted_student_id) VALUES
      ('Alice Student', 'student1@ferexstudent.org', 'Enrolled', '${studentId1}');

    INSERT INTO public.payments (student_id, amount) VALUES
      ('${studentId1}', 5000);
  `);
});

after(async () => {
  await db.close();
});

test('Education Admin can delete student account and unlinks enrolled leads', async () => {
  await asUser(eduAdminId);

  const res = await db.query(`SELECT public.delete_user_by_admin('${studentId1}'::uuid, NULL) AS result;`);
  const result = res.rows[0].result;
  assert.equal(result.success, true);

  // Check public.users
  const userCheck = await db.query(`SELECT id FROM public.users WHERE id = '${studentId1}';`);
  assert.equal(userCheck.rows.length, 0, 'Student should be deleted from public.users');

  // Check auth.users
  const authCheck = await db.query(`SELECT id FROM auth.users WHERE id = '${studentId1}';`);
  assert.equal(authCheck.rows.length, 0, 'Student should be deleted from auth.users');

  // Check applications
  const appCheck = await db.query(`SELECT id FROM public.applications WHERE student_id = '${studentId1}';`);
  assert.equal(appCheck.rows.length, 0, 'Applications should be cascaded');

  // Check payments: student_id should be NULL (not deleted, to preserve historical financial ledger)
  const payCheck = await db.query(`SELECT student_id, amount FROM public.payments WHERE amount = 5000;`);
  assert.equal(payCheck.rows[0].student_id, null, 'Payment student_id should be set to NULL');

  // Check education_leads: lead should be archived and unlinked to prevent resurrection
  const leadCheck = await db.query(`SELECT status, converted_student_id FROM public.education_leads WHERE email = 'student1@ferexstudent.org';`);
  assert.equal(leadCheck.rows[0].status, 'Archived', 'Lead status should be Archived');
  assert.equal(leadCheck.rows[0].converted_student_id, null, 'Lead converted_student_id should be NULL');
});

test('Education Admin cannot delete another Admin or Counselor', async () => {
  await asUser(eduAdminId);

  await assert.rejects(
    db.query(`SELECT public.delete_user_by_admin('${counselorId}'::uuid, NULL);`),
    /Unauthorized: Education Administrators can only delete student accounts/
  );
});

test('Counselor cannot delete any user account', async () => {
  await asUser(counselorId);

  await assert.rejects(
    db.query(`SELECT public.delete_user_by_admin('${studentId2}'::uuid, NULL);`),
    /Unauthorized: You do not have permission to delete user accounts/
  );
});

test('Self-deletion of administrator is strictly blocked', async () => {
  await asUser(superAdminId);

  await assert.rejects(
    db.query(`SELECT public.delete_user_by_admin('${superAdminId}'::uuid, NULL);`),
    /Security restriction: You cannot delete your own active administrator account/
  );
});
