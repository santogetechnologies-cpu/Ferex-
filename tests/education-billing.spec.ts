import { test, expect, type Page } from '@playwright/test';
const studentId = '10000000-0000-4000-8000-000000000001';
const adminId = '10000000-0000-4000-8000-000000000002';
const uniId = '20000000-0000-4000-8000-000000000001';
const appId = '30000000-0000-4000-8000-000000000001';
const fee = { id: 'registration', title: 'Advanced Registration Fee', enabled: true, amount: 1500, currency: 'INR', recipient: 'ferex', stage: 3, timing: 'before', description: '', countryAmounts: { Canada: 2000 } };

async function setup(page: Page, role = 'education_admin', existingPayments: any[] = []) {
  const id = role === 'student' ? studentId : adminId;
  const user = { id, email: `${role}@example.com`, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Test User' }, created_at: '2026-01-01' };
  const profile = { id, email: user.email, full_name: role === 'student' ? 'Test Student' : 'Test Admin', role };
  const student = { id: studentId, email: 'student@example.com', full_name: 'Test Student', role: 'student' };
  const university = { id: uniId, name: 'Example University', country: 'Canada', city: 'Toronto', is_active: true, ranking: 10, programs: ['Computer Science'], course_programs: [], intakes: ['September'], tuition_range: 'CAD 20,000 / yr' };
  const application = { id: appId, student_id: studentId, university_id: uniId, university_name: university.name, course: 'Computer Science', program_name: 'Computer Science', status: 'Offer Issued', created_at: '2026-01-01', offer_letter_url: 'https://example.com/offer.pdf', universities: university, users: student };
  let payments = [...existingPayments];
  const saved: any[] = [];
  const configurations: any[] = [];
  const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'test'].join('.');
  await page.addInitScript(({ user, token }) => {
    const session = { access_token: token, refresh_token: 'test', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
    localStorage.setItem('sb-ouvezsfvdkecpugzuhuk-auth-token', JSON.stringify(session));
  }, { user, token });
  await page.route('**/*.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), name = url.pathname.split('/').pop();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });
    let result: any = [];
    const object = request.headers().accept?.includes('object');
    if (url.pathname.includes('/auth/v1/user')) result = user;
    else if (url.pathname.includes('/auth/v1/logout')) result = {};
    else if (name === 'users') { const one = url.searchParams.get('id') === `eq.${studentId}` ? student : profile; result = object ? one : url.searchParams.has('id') ? [one] : url.searchParams.get('role') === 'eq.student' ? [student] : [student, profile]; }
    else if (name === 'universities') result = [university];
    else if (name === 'destinations') result = [{ id: 'dest-ca', name: 'Canada', flag: 'CA' }, { id: 'dest-de', name: 'Germany', flag: 'DE' }];
    else if (name === 'applications') result = object ? application : [application];
    else if (name === 'payments') {
      if (request.method() === 'POST') {
        const rows = request.postDataJSON(); saved.push(...rows); payments.push(...rows.map((r: any, i: number) => ({ ...r, id: r.id || `pay-${i}`, created_at: new Date().toISOString() }))); result = [];
      } else result = url.searchParams.has('ref_no') ? [] : payments;
    }
    else if (name === 'education_workflow_progress') result = [{ id: 's2', student_id: studentId, stage_number: 2, stage_name: 'Service agreement', status: 'Completed' }];
    else if (name === 'education_student_preferences') result = object ? { country: 'Canada' } : [{ student_id: studentId, country: 'Canada' }];
    else if (name === 'education_service_agreements') result = object ? { body: { student_id: studentId, status: 'Signed', signature_data: 'Test Student' } } : [{ body: { student_id: studentId, status: 'Signed', signature_data: 'Test Student' } }];
    else if (name === 'system_config') {
      const value = { education_fees: [fee], advance_registration_fee_amount: 1500, payment_gateways: { phonepe_upi_enabled: true } };
      if (url.searchParams.get('key') === 'eq.payment_gateways') { const record = { value: { upi: { enabled: true, upiId: 'test@upi', merchantName: 'Test merchant' }, divisions: { education: { allowUpi: true } } } }; result = object ? record : [record]; }
      else if (request.method() === 'POST') { configurations.push(request.postDataJSON()); result = []; }
      else if (url.searchParams.get('key') === 'eq.fee_config') result = object ? { value } : [{ value }];
      else result = object ? null : [{ key: 'fee_config', value }, { key: 'ferex_fee_governance_config', value }];
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify(result) });
  });
  return { saved, configurations };
}

for (const [role, path] of [
  ['education_admin', '/admin/payment-control'], ['admin', '/admin/fee-config'],
  ['central', '/central/education-billing'], ['superadmin', '/central/payments'],
  ['education_admin', '/admin/universities'], ['education_admin', '/admin/students'], ['education_admin', '/admin/enquiries'],
  ['student', '/student/payments'], ['student', '/student/journey-tracker'],
  ['student', '/student/select-university'], ['student', '/student/offers'],
  ['student', '/student/invoices'], ['student', '/student/receipts'],
] as const) test(`${role}: ${path} renders without runtime errors`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await setup(page, role); await page.goto(path);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(path));
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('student sees country override, only UPI and pending verification after submission', async ({ page }) => {
  const { saved } = await setup(page, 'student'); await page.goto('/student/payments');
  await page.getByRole('button', { name: 'Pay by UPI', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('₹2,000.00');
  await page.screenshot({ path: test.info().outputPath('student-upi.png'), fullPage: true });
  await expect(page.getByRole('dialog').getByRole('combobox')).toHaveCount(0);
  await page.getByLabel('UPI transaction reference').fill('123456789012');
  await page.getByRole('button', { name: 'Submit UPI reference', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saved[0].status).toBe('Pending Verification'); expect(saved[0].amount).toBe(2000); expect(saved[0].payment_method).toBe('UPI');
});
test('admin records three payment entries as one atomic request', async ({ page }) => {
  const { saved } = await setup(page); await page.goto('/admin/payment-control');
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption(studentId);
  await page.getByRole('button', { name: 'Collect fee (full, partial or split)' }).click();
  await page.getByLabel('Entry 1 amount').fill('1000'); await page.getByLabel('Entry 1 reference').fill('BANK-1');
  await page.getByRole('button', { name: 'Add payment entry', exact: true }).click();
  await page.getByLabel('Entry 2 amount').fill('600'); await page.getByLabel('Entry 2 reference').fill('CASH-1');
  await page.getByRole('button', { name: 'Add payment entry', exact: true }).click();
  await page.getByLabel('Entry 3 reference').fill('UPI-1'); await page.getByLabel('Entry 3 method').selectOption('UPI');
  await page.getByRole('button', { name: 'Record payment entries', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(saved).toHaveLength(3);
  expect(saved.map(p => p.amount)).toEqual([1000, 600, 400]); expect(saved.every(p => p.status === 'Paid')).toBe(true);
});
test('student can pay part of a fee and sees the position clearly', async ({ page }) => {
  const { saved } = await setup(page, 'student'); await page.goto('/student/payments');
  await expect(page.getByLabel('Payment summary INR')).toContainText('Balance to pay');
  await expect(page.getByText('Unpaid', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pay by UPI', exact: true }).click();
  await page.getByLabel('Amount to pay').fill('500');
  await page.getByLabel('UPI transaction reference').fill('123456789012');
  await page.getByRole('button', { name: 'Submit UPI reference', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saved).toHaveLength(1); expect(saved[0].amount).toBe(500); expect(saved[0].status).toBe('Pending Verification');
});
test('university edit has no fee or installment tabs', async ({ page }) => {
  await setup(page); await page.goto('/admin/universities');
  await page.getByRole('button', { name: 'Add University', exact: true }).click();
  await expect(page.getByText('3. University & Agency Fees', { exact: true })).toHaveCount(0);
  await expect(page.getByText('4. Tuition Installments', { exact: false })).toHaveCount(0);
});
test('student cannot enter admin or central billing', async ({ page }) => {
  await setup(page, 'student'); await page.goto('/central/education-billing');
  await expect(page).toHaveURL(/\/student\/dashboard/);
  await page.goto('/admin/payment-control'); await expect(page).toHaveURL(/\/student\/dashboard/);
});

test('fee settings keep before/after timing and no longer offer country overrides', async ({ page }) => {
  const { configurations } = await setup(page); await page.goto('/admin/fee-config');
  const registration = page.locator('article').filter({ hasText: 'Advanced Registration Fee' });
  await registration.getByLabel('Common amount', { exact: true }).fill('1800');
  await registration.getByRole('combobox', { name: 'Payable', exact: true }).selectOption('after');
  await registration.getByRole('combobox', { name: 'Workflow stage', exact: true }).selectOption('10');
  await page.getByRole('button', { name: 'Save fee configuration', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Fee configuration saved');
  await expect(page.getByText('Country-Specific Fee Overrides')).toHaveCount(0);
  const saved = configurations[0][0].value.education_fees[0];
  expect(saved).toMatchObject({ amount: 1800, stage: 10, timing: 'after' });
  // Country amounts now live in country fee plans, so old per-country overrides are dropped on save.
  expect(saved).not.toHaveProperty('countryAmounts');
});
