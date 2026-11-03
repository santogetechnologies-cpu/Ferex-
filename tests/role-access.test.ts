import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSuperAdmin, normalizeRole } from '../src/lib/roleRouter.ts';
test('email text never grants administrator privileges', () => {
  assert.equal(isSuperAdmin(undefined, 'superadmin@example.com'), false);
  assert.equal(isSuperAdmin('student', 'central@example.com'), false);
  assert.equal(normalizeRole('student', 'tradeadmin@example.com'), 'student');
  assert.equal(normalizeRole('education_admin', 'digitaladmin@example.com'), 'education_admin');
});
test('trusted central role aliases retain access', () => {
  for (const role of ['central', 'super_admin', 'superadmin']) assert.equal(isSuperAdmin(role), true);
});
