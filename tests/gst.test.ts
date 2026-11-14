import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gstBreakdown } from '../src/lib/gst.ts';

test('18% GST included in the amount splits into 9% CGST and 9% SGST', () => {
  const g = gstBreakdown(11800, 18);
  assert.deepEqual([g.taxable, g.cgst, g.sgst, g.tax, g.half], [10000, 900, 900, 1800, 9]);
});
test('odd amounts still add up exactly', () => {
  const g = gstBreakdown(1500, 18);
  assert.equal(Math.round((g.taxable + g.cgst + g.sgst) * 100) / 100, 1500);
});
test('no GST means nothing is split', () => {
  const g = gstBreakdown(1500, 0);
  assert.deepEqual([g.taxable, g.cgst, g.sgst, g.tax], [1500, 0, 0, 0]);
});
