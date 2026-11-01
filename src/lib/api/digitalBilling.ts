import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDigitalProjects, getDigitalClients, type DigitalProjectRecord } from './digital';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ScopeItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'base' | 'extra' | 'special_charge';
}

export interface PaymentPart {
  id: string;
  part_number: number;
  label: string; // e.g. "Part 1: 30% Advance", "Part 2: 70% Balance"
  percentage: number;
  configured_amount: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  amount_received: number;
  remaining_balance: number;
}

// Milestone split type definitions
export type MilestoneSplitType = 'advance_30' | 'advance_50' | 'three_milestones' | 'full' | 'custom';

export interface MilestoneStructure {
  type: MilestoneSplitType;
  label: string;
  parts: Array<{ label: string; percentage: number; }>;
}

export interface BillingChangeAudit {
  id: string;
  timestamp: string;
  user: string;
  user_email?: string;
  previous_value: number;
  updated_value: number;
  reason: string;
  change_type: 'scope_added' | 'scope_modified' | 'special_charge' | 'payment_split_changed' | 'scope_reduced';
  details: string;
}

export interface ScopeBreakdownItem {
  id: string;
  component: string; // e.g. "UI/UX Design", "Frontend Development", "Backend API"
  description?: string;
  amount: number;
}

export interface CentralizedProjectBilling {
  id: string;
  project_id: string;
  project_title: string;
  client_id: string;
  client_name: string;
  service_category?: string;
  scope_items: ScopeItem[];
  scope_breakdown?: ScopeBreakdownItem[]; // Cost breakdown by component (design, frontend, backend etc.)
  total_agreed_amount: number;
  payment_split: 1 | 2 | 3;
  milestone_split_type?: MilestoneSplitType; // tracks which preset was used
  advance_percentage?: number; // for 2-part splits (e.g. 30 or 50)
  custom_milestone_parts?: Array<{ label: string; percentage: number }>; // for custom milestone type
  payment_parts: PaymentPart[];
  invoice_no: string;
  status: 'Draft' | 'Approved' | 'In Progress' | 'Completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  audit_trail: BillingChangeAudit[];
}

export interface PaymentMethodEntry {
  id: string;
  method: 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Credit/Debit Card' | 'Payment Gateway' | 'RTGS / NEFT' | 'Other';
  amount: number;
  reference_no?: string; // UTR, Cheque No, Transaction ID
  date: string;
  notes?: string;
}

export interface ActualPaymentTransaction {
  id: string;
  project_id: string;
  project_title: string;
  client_id: string;
  client_name: string;
  billing_id: string;
  payment_part_id: string;
  payment_part_label: string;
  part_number: number;
  total_amount: number;
  payment_methods: PaymentMethodEntry[];
  payment_date: string;
  receipt_number: string;
  tax_invoice_number?: string;
  document_type: 'Payment Receipt' | 'Tax Invoice';
  recorded_by: string;
  status: 'Received' | 'Refunded';
  notes?: string;
  created_at: string;
}

export interface BillingDocument {
  id: string;
  doc_number: string; // REC-DIG-... or INV-DIG-... or CN-DIG-...
  doc_type: 'Payment Receipt' | 'Tax Invoice' | 'Credit Note';
  project_id: string;
  project_title: string;
  client_id: string;
  client_name: string;
  payment_part_label: string;
  part_number?: number;
  transaction_id?: string;
  amount: number;
  tax_amount: number;
  total_settled: number;
  payment_methods: PaymentMethodEntry[];
  issued_date: string;
  due_date?: string;
  status: 'Issued' | 'Settled' | 'Cancelled' | 'Refunded';
  balance_remaining: number;
  notes?: string;
  created_at: string;
  created_by?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function triggerEvent(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

/**
 * Compute payment parts based on milestone structure type and advance percentage.
 * Supports: full (100%), advance_30 (30/70), advance_50 (50/50), three_milestones (40/30/30), custom
 */
export function computePaymentParts(
  total: number,
  split: 1 | 2 | 3,
  existingParts?: PaymentPart[],
  options?: {
    milestoneType?: MilestoneSplitType;
    advancePercentage?: number;
    /** For custom milestone: array of { label, percentage } summing to 100 */
    customParts?: Array<{ label: string; percentage: number }>;
  }
): PaymentPart[] {
  const now = new Date();
  const milestoneType = options?.milestoneType;
  const advancePct = options?.advancePercentage;

  // ── Custom milestone: user-defined percentage split ──────────────────────────
  if (milestoneType === 'custom' && options?.customParts && options.customParts.length > 0) {
    const parts = options.customParts;
    return parts.map((cp, i) => {
      const amt = Math.round(total * (cp.percentage / 100));
      const received = existingParts?.[i]?.amount_received || 0;
      const daysOffset = i === 0 ? 3 : i === parts.length - 1 ? 45 : 20 + i * 10;
      return {
        id: existingParts?.[i]?.id || generateUUID(),
        part_number: i + 1,
        label: `Part ${i + 1}: ${cp.label} (${cp.percentage}%)`,
        percentage: cp.percentage,
        configured_amount: i === parts.length - 1
          ? total - parts.slice(0, -1).reduce((s, p2) => s + Math.round(total * (p2.percentage / 100)), 0)
          : amt,
        due_date: existingParts?.[i]?.due_date || new Date(now.getTime() + daysOffset * 86400000).toISOString().split('T')[0],
        amount_received: received,
        remaining_balance: Math.max(0, (i === parts.length - 1
          ? total - parts.slice(0, -1).reduce((s, p2) => s + Math.round(total * (p2.percentage / 100)), 0)
          : amt) - received),
        status: received >= amt ? 'paid' : received > 0 ? 'partially_paid' : 'unpaid' as const
      };
    });
  }

  if (split === 1) {
    const existingReceived = existingParts?.[0]?.amount_received || 0;
    return [{
      id: existingParts?.[0]?.id || generateUUID(),
      part_number: 1,
      label: 'Full Payment (100%)',
      percentage: 100,
      configured_amount: total,
      due_date: existingParts?.[0]?.due_date || new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
      amount_received: existingReceived,
      remaining_balance: Math.max(0, total - existingReceived),
      status: existingReceived >= total ? 'paid' : existingReceived > 0 ? 'partially_paid' : 'unpaid'
    }];
  } else if (split === 2) {
    // Determine advance percentage: 30% or 50% based on type
    let pct1 = 50; // default
    if (milestoneType === 'advance_30' || advancePct === 30) pct1 = 30;
    else if (milestoneType === 'advance_50' || advancePct === 50) pct1 = 50;
    else if (advancePct && advancePct > 0 && advancePct < 100) pct1 = advancePct;

    const pct2 = 100 - pct1;
    const p1 = Math.round(total * (pct1 / 100));
    const p2 = total - p1;
    const r1 = existingParts?.[0]?.amount_received || 0;
    const r2 = existingParts?.[1]?.amount_received || 0;

    const advLabel = milestoneType === 'advance_30' ? '30% Advance' : milestoneType === 'advance_50' ? '50% Advance' : `${pct1}% Advance`;
    const balLabel = `${pct2}% Balance`;

    return [
      {
        id: existingParts?.[0]?.id || generateUUID(),
        part_number: 1,
        label: `Part 1: ${advLabel}`,
        percentage: pct1,
        configured_amount: p1,
        due_date: existingParts?.[0]?.due_date || new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        amount_received: r1,
        remaining_balance: Math.max(0, p1 - r1),
        status: r1 >= p1 ? 'paid' : r1 > 0 ? 'partially_paid' : 'unpaid'
      },
      {
        id: existingParts?.[1]?.id || generateUUID(),
        part_number: 2,
        label: `Part 2: ${balLabel}`,
        percentage: pct2,
        configured_amount: p2,
        due_date: existingParts?.[1]?.due_date || new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
        amount_received: r2,
        remaining_balance: Math.max(0, p2 - r2),
        status: r2 >= p2 ? 'paid' : r2 > 0 ? 'partially_paid' : 'unpaid'
      }
    ];
  } else {
    // 3-part split: always 40% / 30% / 30%
    const p1 = Math.round(total * 0.4);
    const p2 = Math.round(total * 0.3);
    const p3 = total - p1 - p2;
    const r1 = existingParts?.[0]?.amount_received || 0;
    const r2 = existingParts?.[1]?.amount_received || 0;
    const r3 = existingParts?.[2]?.amount_received || 0;
    return [
      {
        id: existingParts?.[0]?.id || generateUUID(),
        part_number: 1,
        label: 'Part 1: Kickoff Advance (40%)',
        percentage: 40,
        configured_amount: p1,
        due_date: existingParts?.[0]?.due_date || new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        amount_received: r1,
        remaining_balance: Math.max(0, p1 - r1),
        status: r1 >= p1 ? 'paid' : r1 > 0 ? 'partially_paid' : 'unpaid'
      },
      {
        id: existingParts?.[1]?.id || generateUUID(),
        part_number: 2,
        label: 'Part 2: Milestone Review (30%)',
        percentage: 30,
        configured_amount: p2,
        due_date: existingParts?.[1]?.due_date || new Date(now.getTime() + 20 * 86400000).toISOString().split('T')[0],
        amount_received: r2,
        remaining_balance: Math.max(0, p2 - r2),
        status: r2 >= p2 ? 'paid' : r2 > 0 ? 'partially_paid' : 'unpaid'
      },
      {
        id: existingParts?.[2]?.id || generateUUID(),
        part_number: 3,
        label: 'Part 3: Final Handover (30%)',
        percentage: 30,
        configured_amount: p3,
        due_date: existingParts?.[2]?.due_date || new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0],
        amount_received: r3,
        remaining_balance: Math.max(0, p3 - r3),
        status: r3 >= p3 ? 'paid' : r3 > 0 ? 'partially_paid' : 'unpaid'
      }
    ];
  }
}

// ─── 1. Single Source of Truth for Centralized Billing ──────────────────────

export async function getCentralizedBillings(): Promise<CentralizedProjectBilling[]> {
const {commerceList}=await import('./digitalCommerce');return (await commerceList('digital_contracts')).map(c=>({id:c.id,project_id:c.project_id,project_title:c.body.project_title,client_id:'',client_name:c.body.client_name,scope_items:c.body.lines.map((l:any)=>({id:l.id,title:l.title,description:l.tax_label,amount:l.amount,type:'base'})),total_agreed_amount:c.body.total,payment_split:c.body.parts.length,payment_parts:c.body.parts.map((p:any,i:number)=>({id:p.id,part_number:i+1,label:p.label,percentage:p.percentage,configured_amount:p.amount,due_date:p.due_date,amount_received:p.received,remaining_balance:p.amount-p.received,status:p.received>=p.amount?'paid':p.received>0?'partially_paid':'unpaid'})),invoice_no:'',status:'Approved',created_at:c.created_at,updated_at:c.updated_at,audit_trail:[]})) as CentralizedProjectBilling[];
}

export async function deleteCentralizedBilling(billingId: string): Promise<boolean> {
throw new Error('Use Centralised Billing and Payments Ledger for persisted financial operations. Issued documents cannot be deleted.');
}

export async function getCentralizedBillingByProjectId(projectId: string): Promise<CentralizedProjectBilling | null> {
  const billings = await getCentralizedBillings();
  return billings.find(b => b.project_id === projectId) || null;
}

/**
 * Controlled Update Process for Approved Scope or Billing Value
 */
export async function updateCentralizedBillingScope(params: {
  billingId: string;
  newScopeItems: ScopeItem[];
  newPaymentSplit?: 1 | 2 | 3;
  newMilestoneSplitType?: MilestoneSplitType;
  newAdvancePercentage?: number;
  newScopeBreakdown?: ScopeBreakdownItem[];
  /** For custom milestone: user-defined percentage split parts */
  newCustomParts?: Array<{ label: string; percentage: number }>;
  reason: string;
  userName: string;
  userEmail?: string;
  changeType?: 'scope_added' | 'scope_modified' | 'special_charge' | 'payment_split_changed' | 'scope_reduced';
}): Promise<CentralizedProjectBilling> {
throw new Error('Use Centralised Billing and Payments Ledger for persisted financial operations. Issued documents cannot be deleted.');
}

// ─── 2. Payment Ledger: Actual Payment Recording ────────────────────────────

export async function getPaymentTransactions(projectId?: string): Promise<ActualPaymentTransaction[]> {
const {commerceList}=await import('./digitalCommerce');const [txs,contracts]=await Promise.all([commerceList('digital_collections'),commerceList('digital_contracts')]);return txs.map(t=>{const c=contracts.find(c=>c.id===t.contract_id);return {...t,project_id:c?.project_id,project_title:c?.body.project_title,client_name:c?.body.client_name,total_amount:t.amount,payment_methods:[{method:t.method,amount:t.amount,reference_no:t.reference}],status:'Received'};}).filter(t=>!projectId||projectId==='All'||t.project_id===projectId) as ActualPaymentTransaction[];
}

export async function recordPaymentTransaction(payload: {
  project_id: string;
  project_title: string;
  client_id: string;
  client_name: string;
  payment_part_id: string;
  payment_methods: PaymentMethodEntry[];
  payment_date: string;
  recorded_by: string;
  notes?: string;
  document_type?: 'Payment Receipt' | 'Tax Invoice';
}): Promise<{ transaction: ActualPaymentTransaction; receipt: BillingDocument }> {
throw new Error('Use Centralised Billing and Payments Ledger for persisted financial operations. Issued documents cannot be deleted.');
}

// ─── 3. Billing Documents & Audit Records ───────────────────────────────────

export async function getBillingDocuments(projectId?: string): Promise<BillingDocument[]> {
const {commerceList}=await import('./digitalCommerce');return (await commerceList('digital_financial_documents')).filter(d=>!projectId||projectId==='All'||d.body.project_id===projectId).map(d=>({...d,...d.body,doc_number:d.number,doc_type:d.kind,total_settled:d.kind==='Receipt'?d.body.amount:0,tax_amount:d.body.tax,status:'Issued',payment_methods:[]})) as BillingDocument[];
}

export async function issueCreditNote(params: {
  originalDocNumber: string;
  projectId: string;
  amount: number;
  reason: string;
  issuedBy: string;
}): Promise<BillingDocument> {
throw new Error('Use Centralised Billing and Payments Ledger for persisted financial operations. Issued documents cannot be deleted.');
}
