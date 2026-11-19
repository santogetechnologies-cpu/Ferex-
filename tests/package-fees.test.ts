import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packageFees, studentFees, feeBalance, resolveStudentPackage, isDirectFee, directFeeMessage } from '../src/lib/educationBilling.ts';

const base = [
  { id: 'registration', title: 'Advanced Registration Fee', enabled: true, amount: 1500, currency: 'INR', recipient: 'ferex', timing: 'before', stage: 3, description: '' },
  { id: 'agency', title: 'Separate Agency Fee', enabled: true, amount: 25000, currency: 'INR', recipient: 'ferex', timing: 'after', stage: 10, description: '' },
  { id: 'vfs', title: 'VFS / Visa Gov Fee', enabled: true, amount: 15000, currency: 'INR', recipient: 'direct_third_party', timing: 'before', stage: 9, description: '' },
] as any[];
const config = { education_fees: base } as any;
const pkg = (reg: { enabled: boolean; amount: number }) => ({ id: 'p1', currency: 'INR', name: 'Poland', registration_fee: reg, installments: [{ id: 'i1', title: 'Legalization', amount: 20000, stage_trigger: 5, timing: 'before' }] }) as any;

test('package replaces Ferex fees, keeps direct third-party fees, and honours the registration toggle', () => {
  const on = packageFees(pkg({ enabled: true, amount: 5000 }), base).map(f => [f.id, f.amount]);
  assert.deepEqual(on, [['registration', 5000], ['pkg:p1:i1', 20000], ['vfs', 15000]]);
  // Plan registration off: the standard registration fee still applies to every student.
  const off = packageFees(pkg({ enabled: false, amount: 5000 }), base).map(f => [f.id, f.amount]);
  assert.deepEqual(off, [['registration', 1500], ['pkg:p1:i1', 20000], ['vfs', 15000]]);
});

test('percent discount reduces the student fee and keeps the original for display', () => {
  const fees = studentFees(config, undefined, { flow: 'normal', overrides: { registration: { custom_amount: 0, discount_amount: 0, discount_percent: 10, discount_reason: 'Scholarship' } } });
  const reg = fees.find(f => f.id === 'registration')!;
  assert.equal(reg.amount, 1350);
  assert.equal(reg.original_amount, 1500);
  assert.equal(reg.discount_percent, 10);
  assert.equal(fees.find(f => f.id === 'agency')!.amount, 25000);
});

test('partial payments leave the remaining balance', () => {
  const fee = studentFees(config)[0];
  const paid = [{ payment_type: 'education:registration', currency: 'INR', status: 'Paid', amount: 500 }] as any[];
  assert.equal(feeBalance(fee, paid).remaining, 1000);
});

test('a package only applies once the admin has confirmed it for the student', () => {
  const plans = [{ id: 'a', country: 'Poland', is_active: true }, { id: 'c', country: 'Italy', is_active: true }] as any[];
  assert.equal(resolveStudentPackage(null, plans, 'Poland'), null);
  assert.equal(resolveStudentPackage({ flow_mode: 'pending' }, plans, 'Poland'), null);
  assert.equal(resolveStudentPackage({ flow_mode: 'normal' }, plans, 'Poland'), null);
  assert.equal(resolveStudentPackage({ flow_mode: 'package', package_id: 'c' }, plans, 'Poland')?.id, 'c');
});

test('until the plan is confirmed a student only has the registration fee', () => {
  assert.deepEqual(studentFees(config).map(f => f.id), ['registration']);
  assert.deepEqual(studentFees(config, 'Poland', { flow: 'pending' }).map(f => f.id), ['registration']);
  assert.ok(studentFees(config, 'Poland', { flow: 'normal' }).length > 1);
});

test('fees paid to the university or embassy are described, never priced', () => {
  const visa = studentFees(config, 'Poland', { flow: 'normal' }).find(f => f.id === 'vfs')!;
  assert.equal(isDirectFee(visa), true);
  assert.match(directFeeMessage(visa), /Pay this directly to .* Ferex does not collect it\./);
  assert.equal(directFeeMessage({ ...visa, direct_recipient_institution: 'VFS Global' }), 'Pay this directly to VFS Global. Ferex does not collect it.');
});


test('a package carries its GST into its fees, and each instalment can override it', () => {
  const p = { ...pkg({ enabled: true, amount: 5000 }), tax_rate_percent: 18 } as any;
  p.installments = [{ ...p.installments[0], id: 'i1' }, { ...p.installments[0], id: 'i2', tax_rate_percent: 0 }];
  const fees = packageFees(p, base);
  assert.equal(fees.find(f => f.id === 'registration')!.tax_rate_percent, 18);
  assert.equal(fees.find(f => f.id === 'pkg:p1:i1')!.tax_rate_percent, 18);
  assert.equal(fees.find(f => f.id === 'pkg:p1:i2')!.tax_rate_percent, 0);
});

test('a package can leave the registration fee out entirely, or include the standard or a custom one', () => {
  const excluded = packageFees(pkg({ enabled: false, amount: 0, included: false } as any), base).map(f => f.id);
  assert.deepEqual(excluded, ['pkg:p1:i1', 'vfs']);
  // Excluded wins even if a custom amount is still stored.
  assert.deepEqual(packageFees(pkg({ enabled: true, amount: 5000, included: false } as any), base).map(f => f.id), ['pkg:p1:i1', 'vfs']);
  // Included with no custom amount: the standard fee. Packages saved before the toggle existed count as included.
  assert.deepEqual(packageFees(pkg({ enabled: false, amount: 0, included: true } as any), base).map(f => [f.id, f.amount]), [['registration', 1500], ['pkg:p1:i1', 20000], ['vfs', 15000]]);
  assert.deepEqual(packageFees(pkg({ enabled: false, amount: 0 }), base).map(f => f.id), ['registration', 'pkg:p1:i1', 'vfs']);
});

test('installments with no amount are not billed', () => {
  const withBlank = { ...pkg({ enabled: false, amount: 0 }), installments: [{ id: 'i1', title: 'Deposit', amount: 20000, timing: 'after', stage_trigger: 2 }, { id: 'i2', title: 'New Payment Milestone', amount: 0, timing: 'before', stage_trigger: 3 }] } as any;
  assert.deepEqual(packageFees(withBlank, base).map(f => f.id), ['registration', 'pkg:p1:i1', 'vfs']);
});

import { packagePaymentStatus, payableAmount } from '../src/lib/educationBilling.ts';

const polandPlus = (mode: 'inclusive' | 'exclusive', enabled = true) => ({ id: 'pp', currency: 'INR', name: 'Poland Plus', registration_fee: { enabled: true, amount: 10000, included: true }, gst: { enabled, rate: 18, mode },
  installments: [{ id: 'i1', title: 'One', amount: 22500, stage_trigger: 5, timing: 'before' }, { id: 'i2', title: 'Two', amount: 22499, stage_trigger: 9, timing: 'before' }] }) as any;

test('GST: inclusive keeps the price, exclusive adds tax on top, disabled adds nothing', () => {
  assert.deepEqual(packageFees(polandPlus('inclusive'), base).map(f => f.amount).slice(0, 3), [10000, 22500, 22499]);
  assert.deepEqual(packageFees(polandPlus('exclusive'), base).map(f => f.amount).slice(0, 3), [11800, 26550, 26548.82]);
  assert.equal(packageFees(polandPlus('exclusive', false), base)[0].amount, 10000);
  assert.equal(packageFees(polandPlus('inclusive'), base)[1].tax_rate_percent, 18);
  assert.equal(packageFees(polandPlus('inclusive', false), base)[1].tax_rate_percent, 0);
  assert.equal(payableAmount({ gst: { enabled: true, rate: 18, mode: 'exclusive' } }, 100), 118);
});

test('payment status runs from registration pending to completed and refunds', () => {
  const fees = packageFees(polandPlus('inclusive'), base).filter(f => f.recipient === 'ferex');
  const pay = (f: any, status = 'Paid') => ({ id: f.id + status, payment_type: `education:${f.id}`, title: f.title, amount: f.amount, currency: 'INR', status }) as any;
  assert.equal(packagePaymentStatus(fees, []), 'Registration Pending');
  assert.equal(packagePaymentStatus(fees, [pay(fees[0])]), 'Registration Paid');
  assert.equal(packagePaymentStatus(fees, [pay(fees[0]), pay(fees[1])]), 'Partially Paid');
  assert.equal(packagePaymentStatus(fees, fees.map(f => pay(f))), 'Payment Completed');
  assert.equal(packagePaymentStatus(fees, [pay(fees[0], 'Refund Initiated')]), 'Refund Initiated');
  assert.equal(packagePaymentStatus(fees, [pay(fees[0], 'Refunded')]), 'Refunded');
});
