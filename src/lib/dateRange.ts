// One definition of "today", "this week" and "this month" for every list in the app (Education, Rimi, Trade, Digital).
// Weeks run Monday to Sunday. Dates are compared as local calendar days, so an entry made at 11:30 pm still counts for that day.

export type RangeKey = 'all' | 'today' | 'week' | 'month' | 'custom';
export interface DateRange { key: RangeKey; from?: string; to?: string }
export const ALL_TIME: DateRange = { key: 'all' };

export const RANGE_LABELS: Record<Exclude<RangeKey, 'custom'>, string> = { all: 'All time', today: 'Today', week: 'This week', month: 'This month' };

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };

/** The first and last day (inclusive, local time) a range covers. Null for an open end. */
export function resolveRange(range: DateRange, now: Date = new Date()): { from: Date | null; to: Date | null } {
  const today = day(now);
  switch (range.key) {
    case 'today': return { from: today, to: today };
    case 'week': {
      const offset = (today.getDay() + 6) % 7; // Monday = 0
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6) };
    }
    case 'month': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
    case 'custom': return { from: range.from ? parseYmd(range.from) : null, to: range.to ? parseYmd(range.to) : null };
    default: return { from: null, to: null };
  }
}

/** True when the value falls inside the range. A row with no date is kept only while the range is "All time". */
export function inRange(value: string | Date | null | undefined, range: DateRange, now: Date = new Date()): boolean {
  if (range.key === 'all') return true;
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return false;
  const { from, to } = resolveRange(range, now);
  const t = day(d).getTime();
  return (!from || t >= from.getTime()) && (!to || t <= to.getTime());
}

export function describeRange(range: DateRange, now: Date = new Date()): string {
  if (range.key === 'all') return 'All time';
  const { from, to } = resolveRange(range, now);
  const f = (d: Date | null) => (d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '…');
  return range.key === 'today' ? `Today, ${f(from)}` : `${f(from)} – ${f(to)}`;
}
