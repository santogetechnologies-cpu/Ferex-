import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountingPdf, formatAccountingTotals } from '../src/lib/accountingPdf.ts';
test('PDF xref offsets and stream length match actual bytes', async () => {
  const pdf = await accountingPdf('Receipt', ['Reference (123) \\ extended reference', 'EUR 1200.50']).text();
  const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(pdf.slice(xref, xref + 4), 'xref');
  const entries = [...pdf.matchAll(/^(\d{10}) 00000 n/gm)];
  entries.forEach((entry, i) => assert.ok(pdf.slice(Number(entry[1])).startsWith(`${i + 1} 0 obj`)));
  const stream = pdf.match(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/)!;
  assert.equal(Number(stream[1]), stream[2].length);
  assert.ok(pdf.includes('Reference \\(123\\) \\\\ extended reference'));
});
test('accounting totals never combine different currencies', () => {
  const total = formatAccountingTotals([{ amount: 500, currency: 'INR' }, { amount: 20, currency: 'EUR' }, { amount: 200, currency: 'INR' }]);
  assert.ok(total.includes('700.00')); assert.ok(total.includes('20.00'));
  assert.ok(!total.includes('720.00'));
});
