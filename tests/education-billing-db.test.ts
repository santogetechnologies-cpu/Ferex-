import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const student = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000003';
const university = '20000000-0000-4000-8000-000000000001';
const application = '30000000-0000-4000-8000-000000000001';
const db = new PGlite();
const base = readFileSync('supabase/migrations/20260903000000_master_fresh_rebuild.sql', 'utf8');
const table = (name: string) => { const start = base.indexOf(`CREATE TABLE public.${name} (`); return base.slice(start, base.indexOf('\n);', start) + 4); };
const asUser = async (id: string) => { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false), set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`); };
let sequence = 0;
const insert = (studentId: string, amount: number, status = 'Pending Verification', method = 'UPI', feeId = 'registration', extra = '') => db.query(`INSERT INTO payments (student_id,ref_no,title,description,amount,currency,payment_type,payment_method,status,utr_number,billing_application_id${extra ? ',paid_at' : ''}) VALUES ($1,$2,'Submitted title','Test receipt',$3,'INR',$4,$5,$6,$7,$8${extra ? ",'2026-01-01'" : ''}) RETURNING id`, [studentId, `TEST-${++sequence}`, amount, `education:${feeId}`, method, status, `UTR-${sequence}`, application]);

before(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE TABLE public.users(id uuid PRIMARY KEY,role text,email text,full_name text,department text,phone text,status text,created_at timestamptz,updated_at timestamptz);
    CREATE FUNCTION public.get_auth_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT role FROM public.users WHERE id=auth.uid() $$;
    CREATE TABLE public.universities(id uuid PRIMARY KEY,country text,is_active boolean DEFAULT true);
    CREATE TABLE public.destinations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text);
    CREATE TABLE public.system_config(key text PRIMARY KEY,value jsonb,updated_at timestamptz DEFAULT now());
    ${table('applications')} ${table('payments')} ${table('invoices')} ${table('receipts')}
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public,auth TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.payments TO authenticated;
    GRANT SELECT,INSERT,UPDATE ON public.system_config,public.applications TO authenticated;
    INSERT INTO users (id,role) VALUES ('${student}','student'),('${other}','student'),('${admin}','education_admin');
    INSERT INTO universities VALUES ('${university}','Canada',true);
    INSERT INTO destinations (name) VALUES ('Canada'),('Germany');
    INSERT INTO applications(id,student_id,university_id,university_name,course,status) VALUES ('${application}','${student}','${university}','Example University','Computer Science','Offer Issued');
  `);
  await db.exec(readFileSync('supabase/migrations/20261102120000_education_billing_integrity.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261103100000_education_access_integrity.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261103150000_education_multicurrency_discounts_direct_fees.sql', 'utf8'));
  await asUser(admin);
  const fee = (id: string, amount: number, more = {}) => ({ id, title: id === 'registration' ? 'Advanced Registration Fee' : 'Additional fee', enabled: true, amount, currency: 'INR', recipient: 'ferex', stage: 1, timing: 'before', ...more });
  await db.query(`INSERT INTO system_config(key,value) VALUES ('fee_config',$1),('payment_gateways',$2)`, [JSON.stringify({ education_fees: [fee('registration', 1500, { countryAmounts: { Canada: 2000 } }), fee('late', 100, { stage: 10, timing: 'after' }), fee('direct', 100, { recipient: 'direct_third_party' })], payment_gateways: { phonepe_upi_enabled: true } }), JSON.stringify({ upi: { enabled: true }, divisions: { education: { allowUpi: true } } })]);
});
after(async () => { await db.close(); });

test('students cannot insert paid records, another student payment or non-UPI methods', async () => {
  await asUser(student);
  await assert.rejects(insert(student, 100, 'Paid'));
  await assert.rejects(insert(other, 100));
  await assert.rejects(insert(student, 100, 'Pending Verification', 'Cash'));
  await assert.rejects(insert(student, 100, 'Pending Verification', 'UPI', 'direct'));
  await assert.rejects(insert(student, 100, 'Pending Verification', 'UPI', 'late'));
  await assert.rejects(insert(student, 0));
  await assert.rejects(insert(student, -1));
});
test('country fee overrides and pending amounts prevent duplicate collection', async () => {
  await asUser(student);
  const first = await insert(student, 1750);
  const id = first.rows[0].id;
  const canonical = await db.query(`SELECT title,status FROM payments WHERE id=$1`, [id]);
  assert.equal(canonical.rows[0].title, 'Advanced Registration Fee');
  assert.equal(canonical.rows[0].status, 'Pending Verification');
  await assert.rejects(insert(student, 251));
  await assert.rejects(db.query(`UPDATE payments SET status='Paid' WHERE id=$1`, [id]).then(result => { if (!result.affectedRows) throw new Error('RLS blocked'); }));
  await asUser(admin);
  await db.query(`UPDATE payments SET status='Rejected' WHERE id=$1`, [id]);
});
test('admin split inserts are atomic and generate one document per payment', async () => {
  await asUser(admin);
  const values = (amount: number, ref: string) => `('${student}','${ref}','Fee','Split test',${amount},'INR','education:registration','Cash','Paid','${ref}','${application}')`;
  const start = Number((await db.query(`SELECT count(*) AS n FROM payments`)).rows[0].n);
  await assert.rejects(db.exec(`INSERT INTO payments(student_id,ref_no,title,description,amount,currency,payment_type,payment_method,status,utr_number,billing_application_id) VALUES ${values(1000,'ROLLBACK-1')},${values(1001,'ROLLBACK-2')};`));
  assert.equal(Number((await db.query(`SELECT count(*) AS n FROM payments`)).rows[0].n), start);
  await db.exec(`INSERT INTO payments(student_id,ref_no,title,description,amount,currency,payment_type,payment_method,status,utr_number,billing_application_id) VALUES ${values(1000,'SPLIT-1')},${values(600,'SPLIT-2')},${values(400,'SPLIT-3')};`);
  await db.exec('RESET ROLE');
  assert.equal(Number((await db.query(`SELECT count(*) AS n FROM receipts`)).rows[0].n), 3);
  assert.equal(Number((await db.query(`SELECT count(*) AS n FROM invoices`)).rows[0].n), 3);
  await asUser(admin);
  await assert.rejects(db.exec(`UPDATE payments SET amount=1 WHERE ref_no='SPLIT-1'`));
  await assert.rejects(insert(student, 1, 'Paid', 'Cash'));
});
test('students cannot change fee configuration or workflow completion', async () => {
  await asUser(student);
  await assert.rejects(db.exec(`UPDATE system_config SET value='{}' WHERE key='fee_config'`));
  await assert.rejects(db.exec(`INSERT INTO education_workflow_progress(student_id,stage_number,stage_name,status) VALUES ('${student}',10,'Visa decision','Completed')`));
});
test('students can sign only their own agreement and cannot overwrite it', async () => {
  await asUser(student);
  const body = { student_id: student, status: 'Signed', signature_data: 'Student signature' };
  await db.query(`INSERT INTO education_service_agreements(student_id,body) VALUES ($1,$2)`, [student, JSON.stringify(body)]);
  await assert.rejects(db.query(`INSERT INTO education_service_agreements(student_id,body) VALUES ($1,$2)`, [other, JSON.stringify({ ...body, student_id: other })]));
  await assert.rejects(db.exec(`UPDATE education_service_agreements SET body='{}'`));
});

test('a student cannot self-approve admission and visa milestones', async () => {
  await asUser(student);
  await assert.rejects(db.exec(`UPDATE applications SET status='Visa Approved' WHERE id='${application}'`));
});

test('admin can configure fees in PLN (Polish Zloty) and GBP without trigger rejection', async () => {
  await asUser(admin);
  const plnFee = {
    education_fees: [
      { id: 'poland_tuition', title: 'Warsaw Registration', enabled: true, amount: 1500, currency: 'PLN', recipient: 'ferex', stage: 3, timing: 'before', tax_rate_percent: 0 },
      { id: 'uk_admin', title: 'London Fee', enabled: true, amount: 250, currency: 'GBP', recipient: 'ferex', stage: 3, timing: 'before', tax_rate_percent: 0 }
    ]
  };
  await assert.doesNotReject(db.query(`UPDATE system_config SET value=$1 WHERE key='fee_config'`, [JSON.stringify(plnFee)]));
});
