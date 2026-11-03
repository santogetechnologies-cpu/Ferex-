import { test } from 'node:test';
import assert from 'node:assert/strict';
import { educationStageAccess, feeBalance, feeIsDue, matchesEducationFee, registrationSettled, resolveEducationFee, validateEducationFees, validatePaymentParts } from '../src/lib/educationBilling.ts';
import type { EducationFee, PaymentPart } from '../src/lib/educationBilling.ts';
import type { Payment, JourneyStage } from '../src/lib/types.ts';
import type { SystemFeeConfig } from '../src/lib/api/feeConfig.ts';

const fee: EducationFee = { id: 'registration', title: 'Advanced Registration Fee', amount: 1500, enabled: true, currency: 'INR', recipient: 'ferex', timing: 'before', stage: 3, description: '' };
const config = (fees = [fee]) => ({ education_fees: fees }) as SystemFeeConfig;
const payment = (amount: number, status = 'Paid', more = {}) => ({ amount, status, currency: 'INR', payment_type: 'education:registration', ...more }) as Payment;
const stage = (n: number, status = 'Completed') => [{ stage_number: n, status }] as JourneyStage[];

test('verified split receipts accumulate; a partial receipt never settles the fee', () => {
  assert.equal(registrationSettled(config(), [payment(500)]), false);
  assert.equal(registrationSettled(config(), [payment(500), payment(1000)]), true);
  assert.deepEqual(feeBalance(fee, [payment(500), payment(1000, 'Pending Verification')]), { paid: 500, pending: 1000, remaining: 1000, payable: 0 });
  assert.equal(feeBalance(fee, [payment(500, 'Partial', { partial_amount: 200 })]).paid, 200);
});
test('rejected, refunded, unrelated and other-currency payments do not settle a fee', () => {
  const records = [payment(1500, 'Rejected'), payment(1500, 'Refunded'), payment(1500, 'Paid', { currency: 'EUR' }), payment(1500, 'Paid', { payment_type: 'education:another-fee' })];
  assert.equal(feeBalance(fee, records).paid, 0);
  assert.equal(matchesEducationFee(payment(1500, 'Paid', { title: fee.title, payment_type: 'education:other' }), fee), false);
});
test('country overrides are case-insensitive and support explicit zero waivers', () => {
  const regional = { ...fee, countryAmounts: { Canada: 2500, Germany: 0 } };
  assert.equal(resolveEducationFee(regional, ' CANADA ').amount, 2500);
  assert.equal(resolveEducationFee(regional, 'Germany').amount, 0);
  assert.equal(resolveEducationFee(regional, 'France').amount, 1500);
});
test('disabled and zero-value registration fees do not block the student', () => {
  assert.equal(registrationSettled(config([{ ...fee, enabled: false }]), []), true);
  assert.equal(registrationSettled(config([{ ...fee, amount: 0 }]), []), true);
});
test('moving a fee to a later stage removes the earlier payment prerequisite', () => {
  assert.equal(educationStageAccess(config([{ ...fee, stage: 10, timing: 'after' }]), [], 6).allowed, true);
  assert.equal(educationStageAccess(config([{ ...fee, stage: 10, timing: 'after' }]), [], 11).allowed, false);
  assert.equal(educationStageAccess(config([{ ...fee, recipient: 'direct_third_party' }]), [], 11).allowed, true);
});
test('before and after timing use the configured stage boundary', () => {
  assert.equal(feeIsDue(fee, stage(2)), true);
  assert.equal(feeIsDue({ ...fee, timing: 'after' }, stage(2)), false);
  assert.equal(feeIsDue({ ...fee, timing: 'after' }, stage(3)), true);
});
test('split validation accepts many methods and exact decimal totals', () => {
  const parts: PaymentPart[] = ['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Card'].map((method, i) => ({ method: method as PaymentPart['method'], amount: 0.1, reference: `ref-${i}`, date: '2026-01-01' }));
  assert.doesNotThrow(() => validatePaymentParts(parts, 0.5));
  assert.throws(() => validatePaymentParts(parts, 0.6));
  assert.throws(() => validatePaymentParts([...parts, parts[0]], 0.6));
  assert.throws(() => validatePaymentParts([{ ...parts[0], amount: -1 }], 1));
  assert.throws(() => validatePaymentParts([{ ...parts[0], amount: 0.001 }], 0.001));
  assert.throws(() => validatePaymentParts([{ ...parts[0], date: '2026-02-31' }], 0.1));
});
test('university fees stay direct and fee configuration rejects invalid amounts', () => {
  assert.throws(() => validateEducationFees([{ ...fee, title: 'University tuition' }]));
  assert.throws(() => validateEducationFees([{ ...fee, amount: NaN }]));
  assert.throws(() => validateEducationFees([{ ...fee, countryAmounts: { Canada: -1 } }]));
  assert.doesNotThrow(() => validateEducationFees([{ ...fee, title: 'University tuition', recipient: 'direct_third_party' }]));
});
