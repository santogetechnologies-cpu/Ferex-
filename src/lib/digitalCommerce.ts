export interface CommerceLine { id: string; title: string; amount: number; tax_rate: number; tax_label: string; tax_amount?: number }
export interface CommercePart { id: string; label: string; percentage: number; due_date: string; service_ids: string[]; amount?: number; received?: number }
export interface CommerceBody {
  project_id: string; project_title: string; client_name: string; client_email: string;
  country: string; currency: string; lines: CommerceLine[]; parts: CommercePart[];
  subtotal?: number; tax?: number; total?: number; notes: string;
}
export interface CommerceContract { id: string; revision: number; project_id: string; body: CommerceBody }
export interface CommerceSettings {
  agency_name: string; address: string; tax_number: string; payment_instructions?: string; default_currency: string;
  taxes: { id: string; label: string; rate: number; country: string }[];
  services: { id: string; name: string }[];
  terms: { id: string; name: string; parts: { label: string; percentage: number; days: number; service_ids: string[] }[] }[];
}
export const defaultCommerceSettings: CommerceSettings = {
  agency_name: 'Ferex Digital', address: '', tax_number: '', default_currency: 'INR',
  taxes: [{ id: 'none', label: 'No tax / exempt', rate: 0, country: '*' }],
  services: [{ id: 'web', name: 'Web Development' }, { id: 'design', name: 'Design' }, { id: 'marketing', name: 'Digital Marketing' }],
  terms: [{ id: 'half', name: '50% advance / 50% delivery', parts: [{ label: 'Advance', percentage: 50, days: 0, service_ids: [] }, { label: 'Delivery', percentage: 50, days: 30, service_ids: [] }] }],
};
export function currencyDigits(currency: string) {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a three-letter currency code');
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}
export function money(amount: number, currency: string) { return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount); }
export function validateCommerce(body: CommerceBody) {
  const digits = currencyDigits(body.currency);
  if (!/^[A-Z]{2}$/.test(body.country)) throw new Error('Enter a two-letter country code');
  if (!body.project_id || !body.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.client_email)) throw new Error('Project and valid client email are required');
  if (!body.lines.length || !body.parts.length) throw new Error('Add services and payment terms');
  const ids = new Set(body.lines.map(l => l.id));
  if (ids.size !== body.lines.length || new Set(body.parts.map(p=>p.id)).size !== body.parts.length) throw new Error('Duplicate service or term IDs');
  let subtotal = 0, tax = 0;
  const round = (v: number) => Math.round((v + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  for (const line of body.lines) {
    if (!line.title.trim() || !Number.isFinite(line.amount) || line.amount < 0 || !Number.isFinite(line.tax_rate) || line.tax_rate < 0 || line.tax_rate > 100) throw new Error('Invalid service amount or tax rate');
    subtotal += round(line.amount); tax += round(round(line.amount) * line.tax_rate / 100);
  }
  for (const p of body.parts) {
    if (!p.label.trim() || !Number.isFinite(p.percentage) || p.percentage <= 0 || p.percentage > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(p.due_date) || !Number.isFinite(Date.parse(p.due_date))) throw new Error('Each payment term needs a name, percentage and due date');
    if (!p.service_ids.length || p.service_ids.some(id => !ids.has(id))) throw new Error('Link each payment term to valid services');
  }
  if (Math.abs(body.parts.reduce((sum,p) => sum+p.percentage,0)-100)>0.000001) throw new Error('Payment percentages must total 100');
  if (body.lines.some(l => !body.parts.some(p => p.service_ids.includes(l.id)))) throw new Error('Every service needs a payment term');
  if (subtotal + tax <= 0) throw new Error('Contract total must be positive');
  return { subtotal: round(subtotal), tax: round(tax), total: round(subtotal+tax) };
}
export function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }

/** Where a payment term stands today. Used to track milestones, partial payments and what is overdue. */
export type TermStatus = 'Paid' | 'Partially Paid' | 'Overdue' | 'Due Soon' | 'Upcoming';
export interface TermTracking { id: string; label: string; due_date: string; amount: number; received: number; remaining: number; percent_paid: number; status: TermStatus; days_to_due: number }
export function trackTerm(part: CommercePart, today = new Date()): TermTracking {
  const amount = Number(part.amount || 0), received = Number(part.received || 0), remaining = Math.max(0, amount - received);
  const t0 = new Date(today.toISOString().slice(0, 10)).getTime();
  const days = Math.round((new Date(part.due_date).getTime() - t0) / 86400000);
  let status: TermStatus = 'Upcoming';
  if (amount > 0 && remaining <= 0) status = 'Paid';
  else if (days < 0) status = 'Overdue';
  else if (received > 0) status = 'Partially Paid';
  else if (days <= 7) status = 'Due Soon';
  // A term that is partly paid and past due is still overdue for the remainder.
  return { id: part.id, label: part.label, due_date: part.due_date, amount, received, remaining, percent_paid: amount > 0 ? Math.min(100, Math.round((received / amount) * 1000) / 10) : 0, status, days_to_due: days };
}
export function trackContract(body: CommerceBody, today = new Date()) {
  const terms = (body.parts || []).map(p => trackTerm(p, today));
  const total = Number(body.total || 0), received = terms.reduce((s, t) => s + t.received, 0);
  const overdue = terms.filter(t => t.status === 'Overdue');
  const next = terms.filter(t => t.status !== 'Paid').sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  return { terms, total, received, outstanding: Math.max(0, total - received), overdue_amount: overdue.reduce((s, t) => s + t.remaining, 0), overdue_count: overdue.length, next_due: next, percent_paid: total > 0 ? Math.min(100, Math.round((received / total) * 1000) / 10) : 0 };
}
/** "₹1.2L · $500": totals kept per currency, never added across currencies. */
export function formatTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (!entries.length) return '0';
  return entries.map(([cur, v]) => new Intl.NumberFormat('en', { style: 'currency', currency: cur, notation: v >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(v)).join(' · ');
}
