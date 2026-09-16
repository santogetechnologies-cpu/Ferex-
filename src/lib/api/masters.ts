/**
 * masters.ts
 * Central configurable master data store.
 * All dropdowns in Rimi Frozen CRM and Ferex Digital CRM load from here.
 * Admin can add/remove values from Settings → Masters.
 * Nothing is hardcoded in the UI.
 */

import { supabase } from '../supabase';

function triggerSync(eventName: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(eventName));
}

// ─── Default seed values per app/type ────────────────────────────────────────

const DEFAULTS: Record<string, Record<string, string[]>> = {
  rimi: {
    pipeline_stages: ['Lead', 'Contacted', 'Demo Given', 'Negotiation', 'Won', 'Lost'],
    territories: ['South Mumbai', 'North Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Nashik'],
    regions: ['West', 'South', 'North', 'East', 'Central'],
    payment_terms: ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', 'Credit'],
    tags: ['High Value', 'Key Account', 'New Customer', 'At Risk', 'VIP', 'Seasonal'],
    product_categories: [
      'Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables',
      'Processed Food', 'Ice Cream & Dairy', 'Bakery & Pastries',
      'Ready-to-Eat Meals', 'IQF Fruits & Berries',
    ],
    order_statuses: ['Draft', 'Confirmed', 'Dispatched', 'Delivered', 'Invoiced', 'Cancelled'],
    customer_types: ['Distributor', 'Wholesaler', 'RetailShop'],
  },
  digital: {
    project_stages: ['Briefing', 'In Progress', 'Review', 'Revisions', 'Delivered', 'Closed'],
    client_categories: ['Internal', 'External', 'Partner', 'Agency'],
    service_categories: [
      'Digital Marketing & Advertising', 'Brand Identity & Design',
      'Website Development', 'Mobile App Development', 'SEO & Content',
      'Social Media Management', 'Photography & Video', 'UI/UX Design',
    ],
    task_priorities: ['Critical', 'High', 'Medium', 'Low'],
    payment_terms: ['Advance Payment', 'Milestone-Based', 'Full Payment', '50/50 Split'],
    tags: ['High Value', 'Long-Term', 'Rush', 'On Hold', 'Retainer', 'One-Time'],
    task_statuses: ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'],
    deliverable_types: [
      'Design Files', 'Figma Link', 'Google Drive', 'Website URL',
      'Final Assets', 'Video Reel', 'PDF / Document', 'GitHub / Code',
    ],
    invoice_statuses: ['Paid', 'Pending', 'Partial', 'Overdue'],
  },
};

// ─── localStorage key helper ──────────────────────────────────────────────────

function lsKey(app: 'rimi' | 'digital', type: string) {
  return `ferex_masters_${app}_${type}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all values for a master type.
 * Returns merged defaults + any custom values added by admin.
 */
export async function getMasters(app: 'rimi' | 'digital', type: string): Promise<string[]> {
  const defaults = DEFAULTS[app]?.[type] ?? [];
  const customSet = new Set<string>(defaults);

  // Try Supabase
  try {
    const { data, error } = await supabase
      .from('crm_masters')
      .select('value')
      .eq('app', app)
      .eq('type', type)
      .eq('is_deleted', false)
      .order('value', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((row: any) => { if (row.value) customSet.add(row.value); });
      try { localStorage.setItem(lsKey(app, type), JSON.stringify(Array.from(customSet))); } catch {}
      return Array.from(customSet);
    }
  } catch {}

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(lsKey(app, type));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        parsed.forEach((v: string) => { if (v) customSet.add(v); });
      }
    }
  } catch {}

  return Array.from(customSet);
}

/**
 * Add a new master value. Returns updated list.
 */
export async function createMaster(app: 'rimi' | 'digital', type: string, value: string): Promise<string[]> {
  const trimmed = value.trim();
  if (!trimmed) return getMasters(app, type);

  const current = await getMasters(app, type);
  if (current.includes(trimmed)) return current;

  // Try Supabase
  try {
    await supabase.from('crm_masters').insert({
      app, type, value: trimmed, is_deleted: false,
      created_at: new Date().toISOString(),
    });
  } catch {}

  // localStorage backup
  const updated = [...current, trimmed];
  try { localStorage.setItem(lsKey(app, type), JSON.stringify(updated)); } catch {}
  triggerSync(`ferex_masters_${app}_${type}_change`);
  return updated;
}

/**
 * Remove a master value. Returns updated list.
 */
export async function deleteMaster(app: 'rimi' | 'digital', type: string, value: string): Promise<string[]> {
  const trimmed = value.trim();

  // Try Supabase
  try {
    await supabase.from('crm_masters')
      .update({ is_deleted: true })
      .eq('app', app).eq('type', type).eq('value', trimmed);
  } catch {}

  const current = await getMasters(app, type);
  const updated = current.filter(v => v !== trimmed);
  try { localStorage.setItem(lsKey(app, type), JSON.stringify(updated)); } catch {}
  triggerSync(`ferex_masters_${app}_${type}_change`);
  return updated;
}

/**
 * Sync: get masters synchronously from localStorage (for initial renders).
 */
export function getMastersSync(app: 'rimi' | 'digital', type: string): string[] {
  const defaults = DEFAULTS[app]?.[type] ?? [];
  const s = new Set<string>(defaults);
  try {
    const local = localStorage.getItem(lsKey(app, type));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) parsed.forEach((v: string) => { if (v) s.add(v); });
    }
  } catch {}
  return Array.from(s);
}

// ─── Convenience re-exports for common masters ────────────────────────────────

export const getRimiPipelineStages = () => getMasters('rimi', 'pipeline_stages');
export const getRimiTerritories = () => getMasters('rimi', 'territories');
export const getRimiRegions = () => getMasters('rimi', 'regions');
export const getRimiPaymentTerms = () => getMasters('rimi', 'payment_terms');
export const getRimiTags = () => getMasters('rimi', 'tags');
export const getRimiOrderStatuses = () => getMasters('rimi', 'order_statuses');
export const getRimiCustomerTypes = () => getMasters('rimi', 'customer_types');

export const getDigitalProjectStages = () => getMasters('digital', 'project_stages');
export const getDigitalClientCategories = () => getMasters('digital', 'client_categories');
export const getDigitalServiceCategories = () => getMasters('digital', 'service_categories');
export const getDigitalTaskPriorities = () => getMasters('digital', 'task_priorities');
export const getDigitalPaymentTerms = () => getMasters('digital', 'payment_terms');
export const getDigitalTags = () => getMasters('digital', 'tags');
export const getDigitalTaskStatuses = () => getMasters('digital', 'task_statuses');
export const getDigitalDeliverableTypes = () => getMasters('digital', 'deliverable_types');
export const getDigitalInvoiceStatuses = () => getMasters('digital', 'invoice_statuses');
