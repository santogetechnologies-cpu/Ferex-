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
  label: string; // e.g. "Part 1: 50% Advance", "Part 2: 50% Completion"
  percentage: number;
  configured_amount: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  amount_received: number;
  remaining_balance: number;
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

export interface CentralizedProjectBilling {
  id: string;
  project_id: string;
  project_title: string;
  client_id: string;
  client_name: string;
  service_category?: string;
  scope_items: ScopeItem[];
  total_agreed_amount: number;
  payment_split: 1 | 2 | 3;
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

export function computePaymentParts(total: number, split: 1 | 2 | 3, existingParts?: PaymentPart[]): PaymentPart[] {
  const now = new Date();
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
    const p1 = Math.round(total * 0.5);
    const p2 = total - p1;
    const r1 = existingParts?.[0]?.amount_received || 0;
    const r2 = existingParts?.[1]?.amount_received || 0;
    return [
      {
        id: existingParts?.[0]?.id || generateUUID(),
        part_number: 1,
        label: 'Part 1: Advance (50%)',
        percentage: 50,
        configured_amount: p1,
        due_date: existingParts?.[0]?.due_date || new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        amount_received: r1,
        remaining_balance: Math.max(0, p1 - r1),
        status: r1 >= p1 ? 'paid' : r1 > 0 ? 'partially_paid' : 'unpaid'
      },
      {
        id: existingParts?.[1]?.id || generateUUID(),
        part_number: 2,
        label: 'Part 2: Completion (50%)',
        percentage: 50,
        configured_amount: p2,
        due_date: existingParts?.[1]?.due_date || new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
        amount_received: r2,
        remaining_balance: Math.max(0, p2 - r2),
        status: r2 >= p2 ? 'paid' : r2 > 0 ? 'partially_paid' : 'unpaid'
      }
    ];
  } else {
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
        label: 'Part 2: Milestone Alpha (30%)',
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
  let localBillings: CentralizedProjectBilling[] = [];
  try {
    const raw = localStorage.getItem('ferex_digital_centralized_billings');
    if (raw) localBillings = JSON.parse(raw);
  } catch {}

  // Merge with projects to ensure every digital project is automatically reflected
  const projects = await getDigitalProjects();
  const clients = await getDigitalClients();

  const billingMap = new Map<string, CentralizedProjectBilling>();
  localBillings.forEach(b => billingMap.set(b.project_id, b));

  let needsSave = false;

  for (const proj of projects) {
    if (!billingMap.has(proj.id)) {
      // Bootstrap from project definition so other modules don't need re-entry
      const client = clients.find(c => c.id === proj.client_id) || { company_name: proj.client_name || 'Client' };
      const budget = Number(proj.budget || 0);
      const splitTerms: 1 | 2 | 3 = proj.payment_terms === 'Full Payment' ? 1 : 2;
      const initialParts = computePaymentParts(budget, splitTerms);

      const bootstrapped: CentralizedProjectBilling = {
        id: generateUUID(),
        project_id: proj.id,
        project_title: proj.title,
        client_id: proj.client_id || '',
        client_name: proj.client_name || client.company_name,
        service_category: proj.service_category,
        scope_items: [
          {
            id: '1',
            title: proj.title || 'Core Project Scope',
            description: proj.scope || proj.description || 'Full scope deliverables as agreed',
            amount: budget,
            type: 'base'
          }
        ],
        total_agreed_amount: budget,
        payment_split: splitTerms,
        payment_parts: initialParts,
        invoice_no: `INV-DIG-${proj.id.slice(0, 4).toUpperCase()}`,
        status: 'Approved',
        created_at: proj.created_at || new Date().toISOString(),
        updated_at: proj.updated_at || new Date().toISOString(),
        approved_at: proj.created_at || new Date().toISOString(),
        approved_by: proj.created_by || 'Digital Admin',
        audit_trail: [
          {
            id: generateUUID(),
            timestamp: proj.created_at || new Date().toISOString(),
            user: proj.created_by || 'Digital Admin',
            previous_value: 0,
            updated_value: budget,
            reason: 'Initial centralized financial configuration established',
            change_type: 'scope_added',
            details: `Configured commercial value of ₹${budget.toLocaleString('en-IN')} with ${splitTerms}-installment structure`
          }
        ]
      };
      billingMap.set(proj.id, bootstrapped);
      needsSave = true;
    }
  }

  const all = Array.from(billingMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  if (needsSave) {
    try {
      localStorage.setItem('ferex_digital_centralized_billings', JSON.stringify(all));
    } catch {}
  }

  return all;
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
  reason: string;
  userName: string;
  userEmail?: string;
  changeType?: 'scope_added' | 'scope_modified' | 'special_charge' | 'payment_split_changed' | 'scope_reduced';
}): Promise<CentralizedProjectBilling> {
  const billings = await getCentralizedBillings();
  const existing = billings.find(b => b.id === params.billingId);
  if (!existing) {
    throw new Error('Billing record not found');
  }

  const prevValue = existing.total_agreed_amount;
  const newTotal = params.newScopeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const split = params.newPaymentSplit || existing.payment_split;

  // Re-compute payment parts while retaining already received money
  const updatedParts = computePaymentParts(newTotal, split, existing.payment_parts);

  const auditEntry: BillingChangeAudit = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    user: params.userName || 'Digital Admin',
    user_email: params.userEmail,
    previous_value: prevValue,
    updated_value: newTotal,
    reason: params.reason || 'Scope and commercial adjustment',
    change_type: params.changeType || (newTotal > prevValue ? 'scope_added' : 'scope_modified'),
    details: `Scope adjusted from ₹${prevValue.toLocaleString('en-IN')} to ₹${newTotal.toLocaleString('en-IN')} (${params.newScopeItems.length} items, ${split}-part split)`
  };

  const updated: CentralizedProjectBilling = {
    ...existing,
    scope_items: params.newScopeItems,
    total_agreed_amount: newTotal,
    payment_split: split,
    payment_parts: updatedParts,
    status: 'Approved',
    updated_at: new Date().toISOString(),
    audit_trail: [auditEntry, ...(existing.audit_trail || [])]
  };

  const allUpdated = billings.map(b => b.id === updated.id ? updated : b);
  try {
    localStorage.setItem('ferex_digital_centralized_billings', JSON.stringify(allUpdated));
  } catch {}

  // ── Single Source of Truth Synchronization ──
  // Automatically sync to digital_projects so all other modules use the exact same definition!
  try {
    const projectsRaw = localStorage.getItem('ferex_digital_projects');
    if (projectsRaw) {
      const projs: DigitalProjectRecord[] = JSON.parse(projectsRaw);
      const updatedProjs = projs.map(p => {
        if (p.id === updated.project_id) {
          return {
            ...p,
            budget: newTotal,
            payment_terms: (split === 1 ? 'Full Payment' : split === 2 ? 'Advance Payment' : 'Milestone-Based') as any,
            advance_amount: updatedParts[0]?.configured_amount || Math.round(newTotal * 0.5),
            balance_amount: newTotal - (updatedParts[0]?.configured_amount || Math.round(newTotal * 0.5)),
            updated_at: new Date().toISOString()
          };
        }
        return p;
      });
      localStorage.setItem('ferex_digital_projects', JSON.stringify(updatedProjs));
    }
  } catch {}

  // Update Supabase if available
  try {
    await supabase.from('digital_projects').update({
      budget: newTotal,
      updated_at: new Date().toISOString()
    }).eq('id', updated.project_id);
  } catch {}

  triggerEvent('ferex_digital_centralized_billing_change');
  triggerEvent('ferex_digital_projects_change');
  triggerEvent('ferex_digital_invoices_change');

  return updated;
}

// ─── 2. Payment Ledger: Actual Payment Recording ────────────────────────────

export async function getPaymentTransactions(projectId?: string): Promise<ActualPaymentTransaction[]> {
  let list: ActualPaymentTransaction[] = [];
  try {
    const raw = localStorage.getItem('ferex_digital_payment_transactions');
    if (raw) list = JSON.parse(raw);
  } catch {}

  if (projectId && projectId !== 'All') {
    return list.filter(t => t.project_id === projectId);
  }
  return list;
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
  // 1. Validation
  if (!payload.payment_methods || payload.payment_methods.length === 0) {
    throw new Error('At least one payment method entry is required');
  }

  const totalFromMethods = payload.payment_methods.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  if (totalFromMethods <= 0) {
    throw new Error('Total payment amount must be greater than zero');
  }

  // 2. Prevent duplicate transaction references if provided
  const existingTxs = await getPaymentTransactions();
  for (const m of payload.payment_methods) {
    if (m.reference_no && m.reference_no.trim()) {
      const refLower = m.reference_no.trim().toLowerCase();
      const duplicate = existingTxs.some(t =>
        t.payment_methods.some(pm => pm.reference_no && pm.reference_no.trim().toLowerCase() === refLower)
      );
      if (duplicate) {
        throw new Error(`Duplicate transaction reference detected: ${m.reference_no}. This payment has already been recorded.`);
      }
    }
  }

  // 3. Find Centralized Billing & Update Payment Part
  const billings = await getCentralizedBillings();
  const billing = billings.find(b => b.project_id === payload.project_id);
  if (!billing) {
    throw new Error('No centralized billing configuration found for this project');
  }

  const partIndex = billing.payment_parts.findIndex(p => p.id === payload.payment_part_id);
  if (partIndex === -1) {
    throw new Error('Selected payment part not found in project billing structure');
  }

  const targetPart = billing.payment_parts[partIndex];
  const newPartReceived = (targetPart.amount_received || 0) + totalFromMethods;
  const newPartRemaining = Math.max(0, targetPart.configured_amount - newPartReceived);
  const newPartStatus: PaymentPart['status'] = newPartReceived >= targetPart.configured_amount ? 'paid' : 'partially_paid';

  const updatedPart: PaymentPart = {
    ...targetPart,
    amount_received: newPartReceived,
    remaining_balance: newPartRemaining,
    status: newPartStatus
  };

  const updatedParts = [...billing.payment_parts];
  updatedParts[partIndex] = updatedPart;

  const totalReceivedAcrossParts = updatedParts.reduce((sum, p) => sum + (p.amount_received || 0), 0);
  const overallRemaining = Math.max(0, billing.total_agreed_amount - totalReceivedAcrossParts);
  const overallStatus = totalReceivedAcrossParts >= billing.total_agreed_amount ? 'Completed' : 'In Progress';

  const updatedBilling: CentralizedProjectBilling = {
    ...billing,
    payment_parts: updatedParts,
    status: overallStatus,
    updated_at: new Date().toISOString()
  };

  const allBillings = billings.map(b => b.id === updatedBilling.id ? updatedBilling : b);
  try {
    localStorage.setItem('ferex_digital_centralized_billings', JSON.stringify(allBillings));
  } catch {}

  // 4. Generate Unique Receipt / Invoice Number
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const year = new Date(payload.payment_date).getFullYear() || new Date().getFullYear();
  const receiptNo = `REC-DIG-${year}-${randomSuffix}`;
  const docType = payload.document_type || 'Payment Receipt';

  // 5. Create Actual Payment Transaction
  const transaction: ActualPaymentTransaction = {
    id: generateUUID(),
    project_id: payload.project_id,
    project_title: payload.project_title || billing.project_title,
    client_id: payload.client_id || billing.client_id,
    client_name: payload.client_name || billing.client_name,
    billing_id: billing.id,
    payment_part_id: targetPart.id,
    payment_part_label: targetPart.label,
    part_number: targetPart.part_number,
    total_amount: totalFromMethods,
    payment_methods: payload.payment_methods,
    payment_date: payload.payment_date,
    receipt_number: receiptNo,
    document_type: docType,
    recorded_by: payload.recorded_by || 'Digital Accounts Lead',
    status: 'Received',
    notes: payload.notes || '',
    created_at: new Date().toISOString()
  };

  const allTxs = [transaction, ...existingTxs];
  try {
    localStorage.setItem('ferex_digital_payment_transactions', JSON.stringify(allTxs));
  } catch {}

  // 6. Automatic Document Generation (Receipt / Invoice)
  const billingDoc: BillingDocument = {
    id: generateUUID(),
    doc_number: receiptNo,
    doc_type: docType,
    project_id: payload.project_id,
    project_title: payload.project_title || billing.project_title,
    client_id: payload.client_id || billing.client_id,
    client_name: payload.client_name || billing.client_name,
    payment_part_label: targetPart.label,
    part_number: targetPart.part_number,
    transaction_id: transaction.id,
    amount: totalFromMethods,
    tax_amount: docType === 'Tax Invoice' ? Math.round(totalFromMethods * 0.18) : 0,
    total_settled: totalFromMethods,
    payment_methods: payload.payment_methods,
    issued_date: payload.payment_date,
    status: 'Settled',
    balance_remaining: overallRemaining,
    notes: payload.notes || `Received towards ${targetPart.label}`,
    created_at: new Date().toISOString(),
    created_by: payload.recorded_by
  };

  try {
    const rawDocs = localStorage.getItem('ferex_digital_billing_documents');
    const docs: BillingDocument[] = rawDocs ? JSON.parse(rawDocs) : [];
    localStorage.setItem('ferex_digital_billing_documents', JSON.stringify([billingDoc, ...docs]));
  } catch {}

  // Sync to database if digital_payments table exists
  try {
    for (const m of payload.payment_methods) {
      await supabase.from('digital_payments').insert([{
        client_id: payload.client_id,
        invoice_no: receiptNo,
        amount: m.amount,
        payment_method: m.method,
        payment_gateway: m.method,
        transaction_ref: m.reference_no || receiptNo,
        receipt_number: receiptNo,
        status: 'Paid',
        payment_date: payload.payment_date,
      }]);
    }
  } catch {}

  // Sync project progress / payment status
  try {
    const projectsRaw = localStorage.getItem('ferex_digital_projects');
    if (projectsRaw) {
      const projs: DigitalProjectRecord[] = JSON.parse(projectsRaw);
      const updatedProjs = projs.map(p => {
        if (p.id === payload.project_id) {
          const isFullyPaid = overallRemaining <= 0;
          return {
            ...p,
            advance_paid: targetPart.part_number === 1 ? newPartReceived : p.advance_paid,
            balance_paid: targetPart.part_number > 1 ? newPartReceived : p.balance_paid,
            payment_status: isFullyPaid ? ('Paid' as const) : ('Partially Paid' as const),
            updated_at: new Date().toISOString()
          };
        }
        return p;
      });
      localStorage.setItem('ferex_digital_projects', JSON.stringify(updatedProjs));
    }
  } catch {}

  triggerEvent('ferex_digital_payments_change');
  triggerEvent('ferex_digital_centralized_billing_change');
  triggerEvent('ferex_digital_projects_change');
  triggerEvent('ferex_digital_invoices_change');

  return { transaction, receipt: billingDoc };
}

// ─── 3. Billing Documents & Audit Records ───────────────────────────────────

export async function getBillingDocuments(projectId?: string): Promise<BillingDocument[]> {
  let docs: BillingDocument[] = [];
  try {
    const raw = localStorage.getItem('ferex_digital_billing_documents');
    if (raw) docs = JSON.parse(raw);
  } catch {}

  if (projectId && projectId !== 'All') {
    return docs.filter(d => d.project_id === projectId);
  }
  return docs;
}

export async function issueCreditNote(params: {
  originalDocNumber: string;
  projectId: string;
  amount: number;
  reason: string;
  issuedBy: string;
}): Promise<BillingDocument> {
  const docs = await getBillingDocuments();
  const original = docs.find(d => d.doc_number === params.originalDocNumber);

  const year = new Date().getFullYear();
  const cnNumber = `CN-DIG-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

  const creditNote: BillingDocument = {
    id: generateUUID(),
    doc_number: cnNumber,
    doc_type: 'Credit Note',
    project_id: params.projectId,
    project_title: original?.project_title || 'Project Adjustment',
    client_id: original?.client_id || '',
    client_name: original?.client_name || 'Client',
    payment_part_label: original?.payment_part_label || 'Adjustment',
    amount: params.amount,
    tax_amount: 0,
    total_settled: params.amount,
    payment_methods: [{ id: '1', method: 'Bank Transfer', amount: params.amount, date: new Date().toISOString().split('T')[0], notes: params.reason }],
    issued_date: new Date().toISOString().split('T')[0],
    status: 'Settled',
    balance_remaining: 0,
    notes: `Credit Note against ${params.originalDocNumber}: ${params.reason}`,
    created_at: new Date().toISOString(),
    created_by: params.issuedBy
  };

  const updatedDocs = [creditNote, ...docs];
  try {
    localStorage.setItem('ferex_digital_billing_documents', JSON.stringify(updatedDocs));
  } catch {}

  triggerEvent('ferex_digital_invoices_change');
  return creditNote;
}
