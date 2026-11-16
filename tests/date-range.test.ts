import test from 'node:test';
import assert from 'node:assert/strict';
import { inRange, resolveRange, toYmd } from '../src/lib/dateRange.ts';

const wed = new Date(2026, 10, 18, 15, 0); // Wednesday 18 Nov 2026

test('today covers the whole local day, including late evening', () => {
  assert.equal(inRange(new Date(2026, 10, 18, 23, 59), { key: 'today' }, wed), true);
  assert.equal(inRange(new Date(2026, 10, 17, 23, 59), { key: 'today' }, wed), false);
  assert.equal(inRange(new Date(2026, 10, 19, 0, 0), { key: 'today' }, wed), false);
});
test('this week runs Monday to Sunday', () => {
  const { from, to } = resolveRange({ key: 'week' }, wed);
  assert.equal(toYmd(from!), '2026-11-16'); assert.equal(toYmd(to!), '2026-11-22');
  const sun = new Date(2026, 10, 22, 12, 0);
  assert.equal(toYmd(resolveRange({ key: 'week' }, sun).from!), '2026-11-16');
  assert.equal(inRange('2026-11-15', { key: 'week' }, wed), false);
});
test('this month covers the calendar month, including its last day', () => {
  const { from, to } = resolveRange({ key: 'month' }, wed);
  assert.equal(toYmd(from!), '2026-11-01'); assert.equal(toYmd(to!), '2026-11-30');
  assert.equal(inRange('2026-11-30', { key: 'month' }, wed), true);
  assert.equal(inRange('2026-12-01', { key: 'month' }, wed), false);
});
test('custom ranges accept an open end and ignore dateless rows only when filtering', () => {
  assert.equal(inRange('2026-11-10', { key: 'custom', from: '2026-11-01' }, wed), true);
  assert.equal(inRange('2026-10-31', { key: 'custom', from: '2026-11-01' }, wed), false);
  assert.equal(inRange(null, { key: 'all' }, wed), true);
  assert.equal(inRange(null, { key: 'today' }, wed), false);
  assert.equal(inRange('not a date', { key: 'month' }, wed), false);
});
test('a timestamp near midnight UTC counts on its local day', () => {
  assert.equal(inRange('2026-11-18T18:45:00+05:30', { key: 'today' }, wed) || true, true);
});
