import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closuresForMonth, closedAt } from '../src/lib/leadClosures.ts';

const lead = (over: Record<string, unknown>) => ({ id: String(Math.random()), phone: '9', status: 'Enrolled', tags: [], source: 'x', whatsapp_sent: false, created_at: '2026-01-01T10:00:00', updated_at: '2026-01-01T10:00:00', ...over }) as any;

test('only enrolled leads count, grouped by counselor for the chosen month', () => {
  const leads = [
    lead({ name: 'A', assigned_counselor_name: 'Asha', converted_at: '2026-10-05T10:00:00' }),
    lead({ name: 'B', assigned_counselor_name: 'Asha', converted_at: '2026-10-20T10:00:00' }),
    lead({ name: 'C', assigned_counselor_name: 'Ravi', converted_at: '2026-10-21T10:00:00' }),
    lead({ name: 'D', assigned_counselor_name: 'Ravi', converted_at: '2026-09-21T10:00:00' }),
    lead({ name: 'E', assigned_counselor_name: 'Ravi', status: 'Lost', converted_at: '2026-10-21T10:00:00' }),
    lead({ name: 'F', converted_by: 'Admin', converted_at: '2026-10-02T10:00:00' }),
    lead({ name: 'G', assigned_counselor_name: 'Ravi', updated_at: '2026-10-10T10:00:00' }),
  ];
  const r = closuresForMonth(leads, '2026-10');
  assert.equal(r.total, 5);
  assert.deepEqual(r.byCounselor.map(g => [g.counselor, g.count]), [['Asha', 2], ['Ravi', 2], ['Admin', 1]]);
  assert.equal(r.byCounselor[0].students[0].studentName, 'B');
  assert.equal(closuresForMonth(leads, '2026-08').total, 0);
});

test('non-enrolled leads have no closing date', () => {
  assert.equal(closedAt(lead({ status: 'Follow Up' })), null);
});
