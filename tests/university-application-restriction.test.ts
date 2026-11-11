import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
// Pure logic helper functions matching src/lib/api/applications.ts
function isRealApplication(a: any): boolean {
  if (!a) return false;
  const name = (a.university_name || a.universities?.name || '').trim();
  if (!name || name.toLowerCase().includes('pending university') || name.toLowerCase() === 'not set') {
    return false;
  }
  return true;
}

function isApplicationActive(a: any): boolean {
  if (!isRealApplication(a)) return false;
  const status = (a.status || '').trim();
  return status !== 'Withdrawn' && status !== 'Rejected';
}

const studentId = '10000000-0000-4000-8000-000000000001';
const studentId2 = '10000000-0000-4000-8000-000000000002';
const db = new PGlite();

before(async () => {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    DO $$ BEGIN
      CREATE ROLE authenticated;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY,
      email text,
      full_name text,
      role text DEFAULT 'student'
    );

    CREATE TABLE IF NOT EXISTS public.applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid NOT NULL,
      university_id text,
      university_name text DEFAULT 'Pending University Selection',
      program_name text DEFAULT 'Selected European Program',
      course text NOT NULL DEFAULT 'Higher Studies',
      intake text DEFAULT 'October 2026',
      tuition_fee text DEFAULT '€3,500',
      course_fee text DEFAULT '€3,500',
      status text NOT NULL DEFAULT 'Submitted',
      applied_date date DEFAULT CURRENT_DATE,
      notes text DEFAULT '',
      offer_letter_url text DEFAULT '',
      final_acceptance_url text DEFAULT '',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    INSERT INTO public.users (id, email, full_name, role)
    VALUES ('${studentId}', 'teststudent@ferex.com', 'Test Student', 'student'),
           ('${studentId2}', 'teststudent2@ferex.com', 'Test Student 2', 'student');
  `);

  // Apply our migration
  const migrationSql = readFileSync('supabase/migrations/20261111180000_one_active_university_application_per_student.sql', 'utf8');
  await db.exec(migrationSql);
});

after(async () => {
  await db.close();
});

test('helper functions correctly identify real and active applications', () => {
  // Placeholder applications
  assert.equal(isRealApplication({ university_name: 'Pending University Selection' }), false);
  assert.equal(isRealApplication({ university_name: 'Not Set' }), false);
  assert.equal(isRealApplication({ university_name: '' }), false);
  assert.equal(isApplicationActive({ university_name: 'Pending University Selection', status: 'Submitted' }), false);

  // Real applications
  assert.equal(isRealApplication({ university_name: 'Warsaw University of Technology' }), true);
  assert.equal(isApplicationActive({ university_name: 'Warsaw University of Technology', status: 'Submitted' }), true);
  assert.equal(isApplicationActive({ university_name: 'Warsaw University of Technology', status: 'Under Review' }), true);
  assert.equal(isApplicationActive({ university_name: 'Warsaw University of Technology', status: 'Offer Issued' }), true);
  assert.equal(isApplicationActive({ university_name: 'Warsaw University of Technology', status: 'Withdrawn' }), false);
  assert.equal(isApplicationActive({ university_name: 'Warsaw University of Technology', status: 'Rejected' }), false);
});

test('student can insert first active application', async () => {
  const res = await db.query(
    `INSERT INTO public.applications (student_id, university_name, course, status)
     VALUES ($1, $2, $3, $4) RETURNING id, status, university_name`,
    [studentId, 'Warsaw University of Technology', 'BSc Computer Science', 'Submitted']
  );
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].status, 'Submitted');
  assert.equal(res.rows[0].university_name, 'Warsaw University of Technology');
});

test('student CANNOT insert a second active application while current is active (DB Trigger rejects)', async () => {
  await assert.rejects(
    async () => {
      await db.query(
        `INSERT INTO public.applications (student_id, university_name, course, status)
         VALUES ($1, $2, $3, $4)`,
        [studentId, 'Vistula University', 'MSc Data Science', 'Submitted']
      );
    },
    (err: any) => {
      assert.match(err.message, /A student can apply to only ONE university at a time/i);
      return true;
    }
  );
});

test('different student CAN have their own active application simultaneously', async () => {
  const res = await db.query(
    `INSERT INTO public.applications (student_id, university_name, course, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [studentId2, 'Vistula University', 'BBA Business', 'Submitted']
  );
  assert.equal(res.rows.length, 1);
});

test('active application can progress through status updates without trigger error', async () => {
  const updateRes = await db.query(
    `UPDATE public.applications 
     SET status = 'Under Review', notes = 'Documents verified by counselor'
     WHERE student_id = $1 AND university_name = $2
     RETURNING status`,
    [studentId, 'Warsaw University of Technology']
  );
  assert.equal(updateRes.rows[0].status, 'Under Review');

  const updateRes2 = await db.query(
    `UPDATE public.applications 
     SET status = 'Offer Issued'
     WHERE student_id = $1 AND university_name = $2
     RETURNING status`,
    [studentId, 'Warsaw University of Technology']
  );
  assert.equal(updateRes2.rows[0].status, 'Offer Issued');
});

test('student withdraws their active application', async () => {
  const withdrawRes = await db.query(
    `UPDATE public.applications 
     SET status = 'Withdrawn', notes = 'Withdrawn by student.'
     WHERE student_id = $1 AND university_name = $2
     RETURNING status`,
    [studentId, 'Warsaw University of Technology']
  );
  assert.equal(withdrawRes.rows[0].status, 'Withdrawn');
});

test('once withdrawn, student can submit a new application to another university', async () => {
  const res = await db.query(
    `INSERT INTO public.applications (student_id, university_name, course, status)
     VALUES ($1, $2, $3, $4) RETURNING id, status, university_name`,
    [studentId, 'Poznan University of Medical Sciences', 'General Medicine MD', 'Submitted']
  );
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].status, 'Submitted');
  assert.equal(res.rows[0].university_name, 'Poznan University of Medical Sciences');
});

test('withdrawn applications remain in the database preserving application history', async () => {
  const history = await db.query(
    `SELECT id, university_name, status FROM public.applications WHERE student_id = $1 ORDER BY created_at ASC`,
    [studentId]
  );
  // Both applications must exist: 1 Withdrawn and 1 Submitted
  assert.equal(history.rows.length, 2);
  assert.equal(history.rows[0].university_name, 'Warsaw University of Technology');
  assert.equal(history.rows[0].status, 'Withdrawn');
  assert.equal(history.rows[1].university_name, 'Poznan University of Medical Sciences');
  assert.equal(history.rows[1].status, 'Submitted');
});

test('student is blocked from applying to a third university while the second is active', async () => {
  await assert.rejects(
    async () => {
      await db.query(
        `INSERT INTO public.applications (student_id, university_name, course, status)
         VALUES ($1, $2, $3, $4)`,
        [studentId, 'University of Wroclaw', 'BA International Relations', 'Submitted']
      );
    },
    (err: any) => {
      assert.match(err.message, /A student can apply to only ONE university at a time/i);
      return true;
    }
  );
});

test('placeholder application records do not block real applications', async () => {
  const tempStudentId = '10000000-0000-4000-8000-000000000009';
  await db.query(`INSERT INTO public.users (id, email) VALUES ($1, $2)`, [tempStudentId, 'temp@ferex.com']);

  // Insert placeholder
  await db.query(
    `INSERT INTO public.applications (student_id, university_name, course, status)
     VALUES ($1, $2, $3, $4)`,
    [tempStudentId, 'Pending University Selection', 'Higher Studies', 'Enrolled']
  );

  // Inserting a real university should succeed
  const realRes = await db.query(
    `INSERT INTO public.applications (student_id, university_name, course, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [tempStudentId, 'Kozminski University', 'Master in Finance', 'Submitted']
  );
  assert.equal(realRes.rows.length, 1);
});
