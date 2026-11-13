import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';
import { sendTradeShipmentStageEmail, sendTradeInvoiceEmail, sendTradeDocumentReadyEmail, sendStudentEmail } from './email';

// ─── TYPES & MASTER ENUMS ───────────────────────────────────────────────────

export type TradeOrderStage =
  | 'Inquiry'
  | 'Quote Sent'
  | 'Order Confirmed'
  | 'Production/Sourcing'
  | 'Shipped'
  | 'Customs Clearance'
  | 'Delivered';

export const TRADE_ORDER_STAGES: TradeOrderStage[] = [
  'Inquiry',
  'Quote Sent',
  'Order Confirmed',
  'Production/Sourcing',
  'Shipped',
  'Customs Clearance',
  'Delivered'
];

export type TradeDocType =
  | 'Proforma Invoice'
  | 'Commercial Invoice'
  | 'Packing List'
  | 'Bill of Lading / Airway Bill'
  | 'Certificate of Origin'
  | 'Letter of Credit'
  | 'Inspection Certificate';

export const TRADE_STANDARD_DOC_TYPES: TradeDocType[] = [
  'Proforma Invoice',
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading / Airway Bill',
  'Certificate of Origin',
  'Letter of Credit',
  'Inspection Certificate'
];

export type TradeDocInternalStatus = 'Pending' | 'Submitted' | 'Verified' | 'Rejected';

export const TRADE_DOC_STATUSES: TradeDocInternalStatus[] = [
  'Pending',
  'Submitted',
  'Verified',
  'Rejected'
];

export type TradeCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'PLN';
export const TRADE_CURRENCIES: TradeCurrency[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'PLN'];

export type TradeIncoterm =
  | 'CIF (Cost, Insurance and Freight)'
  | 'FOB (Free On Board)'
  | 'CFR (Cost and Freight)'
  | 'EXW (Ex Works)'
  | 'DDP (Delivered Duty Paid)'
  | 'DAP (Delivered at Place)'
  | 'FCA (Free Carrier)';

export const TRADE_INCOTERMS: TradeIncoterm[] = [
  'CIF (Cost, Insurance and Freight)',
  'FOB (Free On Board)',
  'CFR (Cost and Freight)',
  'EXW (Ex Works)',
  'DDP (Delivered Duty Paid)',
  'DAP (Delivered at Place)',
  'FCA (Free Carrier)'
];

export type TicketChannel = 'Email' | 'Phone Call' | 'WhatsApp' | 'In-Person';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export type AutomatedEmailTrigger =
  | 'order_confirmed'
  | 'document_ready'
  | 'invoice_generated'
  | 'payment_received'
  | 'payment_reminder'
  | 'shipped'
  | 'customs_cleared'
  | 'delivered';

export interface StageHistoryEntry {
  stage: TradeOrderStage;
  timestamp: string;
  confirmed_by: string;
  notes?: string;
  auto_email_triggered?: boolean;
}

export interface TradeOrder {
  id: string;
  order_no: string;
  po_number?: string;
  client_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_country?: string;
  commodity: string;
  quantity_units?: string;
  incoterm: TradeIncoterm | string;
  currency: TradeCurrency | string;
  total_amount: number;
  advance_percentage: number;
  advance_amount: number;
  advance_paid: number;
  advance_status: 'Pending' | 'Paid';
  balance_amount: number;
  balance_paid: number;
  balance_status: 'Pending' | 'Paid';
  payment_terms_desc?: string;
  lc_reference?: string;
  stage: TradeOrderStage;
  stage_history: StageHistoryEntry[];
  assigned_staff_name: string;
  assigned_staff_email: string;
  assigned_staff_id?: string;
  carrier?: string;
  vessel_flight?: string;
  voyage_no?: string;
  tracking_number?: string;
  origin_port?: string;
  destination_port?: string;
  etd?: string;
  eta?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TradeDocument {
  id: string;
  order_id?: string;
  order_no: string;
  client_name: string;
  doc_type: TradeDocType | string;
  doc_number?: string;
  file_name: string;
  file_url?: string;
  file_size?: string;
  status: TradeDocInternalStatus;
  rejection_reason?: string;
  notes?: string;
  uploaded_by: string;
  verified_by?: string;
  verified_at?: string;
  sent_to_client: boolean;
  sent_to_client_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TradeTask {
  id: string;
  title: string;
  category: 'Order Handling' | 'Documentation' | 'Logistics' | 'Customs & Port' | 'Finance';
  order_no?: string;
  client_name?: string;
  assigned_to?: string;
  assigned_staff_name: string;
  assigned_staff_email: string;
  assigned_staff_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  notes?: string;
  created_by?: string;
  is_central_directive?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradeTicket {
  id: string;
  ticket_no: string;
  client_name: string;
  client_contact?: string;
  order_no?: string;
  channel: TicketChannel;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  assigned_staff_name: string;
  assigned_staff_email: string;
  assigned_staff_id?: string;
  resolution_notes?: string;
  logged_by: string;
  created_at: string;
  updated_at: string;
}

export const TRADE_MASTER_CERT_TYPES: string[] = [
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'Fumigation Certificate',
  'SGS Quality Inspection Certificate',
  'Health Certificate',
  'EUR.1 Movement Certificate',
  'Non-GMO Certificate',
  'Halal Certification',
  'Kosher Certification'
];

export const TRADE_MASTER_PARTNER_CATEGORIES: string[] = [
  'Buyer / Importer',
  'Seller / Exporter',
  'Freight Forwarder',
  'Customs Broker',
  'Inspection Agency',
  'Shipping Line',
  'Banking Partner'
];

export const TRADE_MASTER_INCOTERMS = TRADE_INCOTERMS;
export const TRADE_MASTER_CURRENCIES = TRADE_CURRENCIES;

export const TRADE_INVOICE_STATUSES: string[] = [
  'Draft',
  'Issued',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled'
];

export const TRADE_MASTER_PAYMENT_METHODS: string[] = [
  'Bank Wire (T/T)',
  'Irrevocable Letter of Credit (LC)',
  'Documents Against Payment (DP)',
  'Escrow',
  'Cash Against Documents (CAD)'
];

export const TRADE_MASTER_BANKS: string[] = [
  'Standard Chartered Bank',
  'BNP Paribas Corporate Banking',
  'State Bank of India (Overseas)',
  'HSBC Global Trade Services',
  'Deutsche Bank AG',
  'Santander Trade Finance',
  'Barclays Corporate Banking',
  'Citibank N.A. International'
];

export const TRADE_MASTER_CARRIERS: string[] = [
  'Maersk Line',
  'MSC Mediterranean Shipping',
  'CMA CGM Group',
  'Hapag-Lloyd',
  'COSCO Shipping Lines',
  'ONE (Ocean Network Express)',
  'Evergreen Marine',
  'Yang Ming Marine Transport',
  'HMM Co., Ltd.'
];

export const TRADE_MASTER_VESSELS: string[] = [
  'MSC GULSUN (IMO 9839438)',
  'MAERSK MC-KINNEY MOLLER (IMO 9619907)',
  'CMA CGM JACQUES SAADE (IMO 9839177)',
  'HAPAG AL ZUBARA (IMO 9708813)',
  'COSCO SHIPPING UNIVERSE (IMO 9795610)',
  'EVER GIVEN (IMO 9811000)',
  'ONE APUS (IMO 9806079)'
];

export const TRADE_MASTER_PORTS: string[] = [
  'Port of Gdansk, Poland',
  'Port of Gdynia, Poland',
  'Port of Hamburg, Germany',
  'Port of Rotterdam, Netherlands',
  'Port of Antwerp, Belgium',
  'Port of Nhava Sheva (JNPT), India',
  'Port of Mundra, India',
  'Port of Chennai, India',
  'Port of Singapore',
  'Port of Jebel Ali (Dubai)'
];

export const TRADE_BL_STATUSES: string[] = [
  'Draft',
  'Issued',
  'Original Surrendered',
  'Telex Released',
  'Accomplished',
  'Cancelled'
];

export interface TradeChatMessage {
  id: string;
  conversation_id: string;
  contact_name: string;
  contact_role?: string;
  sender_name: string;
  message: string;
  is_self: boolean;
  created_at: string;
}

export interface TradeInvoiceRecord {
  id: string;
  invoice_number: string;
  order_no: string;
  shipment_no?: string;
  client_name: string;
  buyer_name?: string;
  seller_name?: string;
  issue_date: string;
  due_date: string;
  amount: number;
  subtotal?: number;
  freight_charges?: number;
  insurance_charges?: number;
  tax_charges?: number;
  payment_terms?: string;
  lc_reference?: string;
  currency: string;
  incoterm: string;
  incoterms?: string;
  status: string;
  paid_amount: number;
  notes?: string;
  items?: any[];
  created_at: string;
}

export interface TradePackingListRecord {
  id: string;
  packing_list_no: string;
  order_no: string;
  shipment_no?: string;
  invoice_no?: string;
  client_name: string;
  buyer_name?: string;
  cargo_description?: string;
  package_type?: string;
  dimensions?: string;
  marks_numbers?: string;
  total_packages: number;
  gross_weight_kg: number;
  net_weight_kg: number;
  volume_cbm: number;
  status: string;
  file_url?: string;
  created_at: string;
}

export interface TradeLetterOfCreditRecord {
  id: string;
  lc_number: string;
  order_no: string;
  shipment_no?: string;
  invoice_no?: string;
  applicant: string;
  beneficiary: string;
  issuing_bank: string;
  advising_bank: string;
  amount: number;
  currency: string;
  expiry_date: string;
  status: string;
  lc_type?: string;
  file_url?: string;
  notes?: string;
  created_at: string;
}

export interface TradeBillOfLadingRecord {
  id: string;
  bl_number: string;
  order_no: string;
  shipment_no?: string;
  carrier: string;
  vessel_name: string;
  voyage_number: string;
  voyage_no?: string;
  freight_terms?: string;
  port_of_loading: string;
  port_of_discharge: string;
  shipper: string;
  consignee: string;
  notify_party?: string;
  container_no?: string;
  cargo_description?: string;
  total_packages?: number;
  gross_weight_kg?: number;
  issue_date: string;
  status: string;
  file_url?: string;
  notes?: string;
  created_at: string;
}

export interface TradePaymentRecord {
  id: string;
  order_no: string;
  order_id?: string;
  invoice_no?: string;
  shipment_no?: string;
  client_name: string;
  client_id?: string;
  partner_entity?: string;
  bank_name?: string;
  account_no?: string;
  payment_type?: string;
  flow_type?: string;
  settlement_date?: string;
  description?: string;
  status?: string;
  type: 'Advance Paid' | 'Advance Payment' | 'Settlement' | 'Balance Settlement' | 'Completed' | 'Full Payment' | 'LC Drawdown' | 'Balance Payment' | string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_ref?: string;
  lc_reference?: string;
  receipt_no: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface TradeAutomatedEmail {
  id: string;
  trigger_type: AutomatedEmailTrigger;
  trigger_label: string;
  order_no: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  content_preview: string;
  sent_at: string;
  status: 'Sent' | 'Delivered' | 'Queued';
}

export interface TradeClientPartner {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  category: string;
  vat_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  portal_active: boolean;
  temp_password?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type TradeStaffOfficer = DivisionStaffMember;

export function getTradeStaffOfficers(): DivisionStaffMember[] {
  return getDivisionStaffSync('trade');
}

export async function fetchTradeStaffOfficers(): Promise<DivisionStaffMember[]> {
  return getDivisionStaff('trade');
}

export const getTradeStaff = fetchTradeStaffOfficers;

function triggerSync(event: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ORDERS & SHIPMENTS (SUPABASE LIVE)
// ─────────────────────────────────────────────────────────────────────────────

// All Trade data is read from and written to the database only; nothing is kept in browser storage, so a record that was
// deleted never comes back and every user sees the same data. Writes throw the real database error.
function tfail(error: { message?: string } | null | undefined, fallback = 'Request failed'): never {
  throw new Error(error?.message || fallback);
}
function tok<T>(res: { data: T; error: any }, fallback?: string): T {
  if (res.error) tfail(res.error, fallback);
  return res.data;
}
const tnum = (v: unknown) => Number(v) || 0;
const isUuidStr = (v?: string | null): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Escapes a value for use inside a PostgREST .or() filter. */
const orSafe = (v: string) => v.replace(/[%,()*]/g, '');
const orderFilter = (idOrNo: string) => (isUuidStr(idOrNo) ? `id.eq.${idOrNo},order_no.eq.${orSafe(idOrNo)}` : `order_no.eq.${orSafe(idOrNo)}`);

const ORDER_COLUMNS = [
  'order_no', 'po_number', 'client_id', 'client_name', 'client_email', 'client_phone', 'client_country', 'commodity',
  'quantity_units', 'incoterm', 'currency', 'total_amount', 'advance_percentage', 'advance_amount', 'advance_paid',
  'advance_status', 'balance_amount', 'balance_paid', 'balance_status', 'payment_terms_desc', 'lc_reference', 'stage',
  'stage_history', 'assigned_staff_name', 'assigned_staff_email', 'assigned_staff_id', 'carrier', 'vessel_flight',
  'voyage_no', 'tracking_number', 'origin_port', 'destination_port', 'etd', 'eta', 'notes',
];
function orderPayload(src: Partial<TradeOrder>) {
  const out: any = {};
  for (const k of ORDER_COLUMNS) if ((src as any)[k] !== undefined) out[k] = (src as any)[k];
  if (out.assigned_staff_id !== undefined && !isUuidStr(out.assigned_staff_id)) out.assigned_staff_id = null;
  if (out.client_id !== undefined && !isUuidStr(out.client_id)) out.client_id = null;
  if (out.etd === '') out.etd = null;
  if (out.eta === '') out.eta = null;
  return out;
}

type PaidTotals = { advance: number; balance: number };

/** Recorded payments per order, split by currency and by advance / balance. */
async function getTradePaymentTotals(): Promise<Map<string, Map<string, PaidTotals>>> {
  const { data } = await supabase.from('trade_payments').select('order_no, type, amount, currency');
  const map = new Map<string, Map<string, PaidTotals>>();
  for (const p of (data || []) as any[]) {
    const byCurrency = map.get(p.order_no) || new Map<string, PaidTotals>();
    const cur = byCurrency.get(p.currency || '') || { advance: 0, balance: 0 };
    if (String(p.type || '').toLowerCase().includes('advance')) cur.advance += tnum(p.amount);
    else cur.balance += tnum(p.amount);
    byCurrency.set(p.currency || '', cur);
    map.set(p.order_no, byCurrency);
  }
  return map;
}

// ──────────────────────────────────────────────────────
// 1. ORDERS & SHIPMENTS
// ──────────────────────────────────────────────────────

export async function getTradeOrders(staffEmail?: string): Promise<TradeOrder[]> {
  let query = supabase.from('trade_orders').select('*').order('created_at', { ascending: false });
  if (staffEmail) {
    const s = orSafe(staffEmail);
    query = query.or(`assigned_staff_email.ilike.%${s}%,assigned_staff_name.ilike.%${s}%`);
  }
  const [rows, totals] = await Promise.all([query, getTradePaymentTotals().catch(() => new Map<string, Map<string, PaidTotals>>())]);
  return ((tok(rows) || []) as any[]).map(o => {
    const mine = totals.get(o.order_no)?.get(o.currency || '') || { advance: 0, balance: 0 };
    // Paid amounts come from the recorded payments in the order's own currency, so a deleted or foreign-currency
    // payment can never leave the order showing the wrong balance.
    const advancePaid = mine.advance;
    const balancePaid = mine.balance;
    const advanceAmount = tnum(o.advance_amount);
    const balanceAmount = tnum(o.balance_amount);
    return {
      ...o,
      total_amount: tnum(o.total_amount),
      advance_percentage: tnum(o.advance_percentage),
      advance_amount: advanceAmount,
      advance_paid: advancePaid,
      advance_status: advanceAmount > 0 && advancePaid >= advanceAmount ? 'Paid' : 'Pending',
      balance_amount: balanceAmount,
      balance_paid: balancePaid,
      balance_status: balanceAmount > 0 && balancePaid >= balanceAmount ? 'Paid' : 'Pending',
      stage_history: Array.isArray(o.stage_history) ? o.stage_history : [],
    } as TradeOrder;
  });
}

export const getTradeShipments = getTradeOrders;

export async function getTradeOrderById(idOrOrderNo: string): Promise<TradeOrder | null> {
  const orders = await getTradeOrders();
  return orders.find(o => o.id === idOrOrderNo || o.order_no === idOrOrderNo) || null;
}

export async function createTradeOrder(order: Partial<TradeOrder>): Promise<TradeOrder | null> {
  if (!order.client_name?.trim()) throw new Error('Choose or enter the client for this order');
  if (!order.commodity?.trim()) throw new Error('Enter the commodity');
  const total = Number(order.total_amount);
  if (!(total > 0)) throw new Error('Enter the order value');
  const advPct = Number(order.advance_percentage);
  const pct = advPct >= 0 && advPct <= 100 ? advPct : 30;
  const advAmt = order.advance_amount !== undefined && Number(order.advance_amount) >= 0 ? Number(order.advance_amount) : Math.round((total * pct) / 100);
  if (advAmt > total) throw new Error('The advance cannot be more than the order value');
  const stage = (order.stage || 'Inquiry') as TradeOrderStage;
  const orderNo = order.order_no?.trim() || `TRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const payload = orderPayload({
    ...order,
    order_no: orderNo,
    client_name: order.client_name.trim(),
    client_email: order.client_email?.trim() || '',
    commodity: order.commodity.trim(),
    currency: order.currency || 'USD',
    total_amount: total,
    advance_percentage: pct,
    advance_amount: advAmt,
    advance_paid: 0,
    advance_status: 'Pending',
    balance_amount: total - advAmt,
    balance_paid: 0,
    balance_status: 'Pending',
    stage,
    stage_history: order.stage_history || [{
      stage,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      confirmed_by: order.assigned_staff_name || 'Trade Desk',
      notes: 'Order initiated in system',
      auto_email_triggered: true,
    }],
    assigned_staff_name: order.assigned_staff_name || '',
    assigned_staff_email: order.assigned_staff_email || '',
  });
  const created = tok(await supabase.from('trade_orders').insert(payload).select().single(), 'Could not save the order') as TradeOrder;

  // Keep the CRM directory in step: add the client if it is new (non-fatal).
  try {
    const known = await supabase.from('trade_clients').select('id').ilike('company_name', created.client_name).maybeSingle();
    if (!known.data) {
      await createTradeClient({
        company_name: created.client_name,
        contact_person: created.client_name,
        email: created.client_email,
        phone: created.client_phone || '',
        country: created.client_country || '',
        category: 'Buyer / Importer',
      });
    }
  } catch {}

  if (created.client_email) {
    sendTradeShipmentStageEmail({
      clientEmail: created.client_email,
      clientName: created.client_name,
      shipmentNumber: created.order_no,
      stage,
      origin: created.origin_port,
      destination: created.destination_port,
      vesselName: created.carrier || created.vessel_flight,
      containerNumber: created.tracking_number,
    }).catch(() => {});
  }
  triggerSync('ferex_trade_orders_change');
  return (await getTradeOrderById(created.id)) || created;
}

export async function advanceTradeOrderStage(
  orderId: string,
  newStage: TradeOrderStage,
  confirmedBy: string = 'Ferex Trade Admin',
  notes?: string
): Promise<TradeOrder | null> {
  const existing = tok(await supabase.from('trade_orders').select('*').or(orderFilter(orderId)).maybeSingle()) as any;
  if (!existing) throw new Error('This order no longer exists. Refresh the page.');
  const history: StageHistoryEntry[] = [
    ...(Array.isArray(existing.stage_history) ? existing.stage_history : []),
    {
      stage: newStage,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      confirmed_by: confirmedBy,
      notes: notes || `Stage confirmed: ${newStage}`,
      auto_email_triggered: Boolean(existing.client_email),
    },
  ];
  tok(await supabase.from('trade_orders').update({ stage: newStage, stage_history: history, updated_at: new Date().toISOString() }).eq('id', existing.id), 'Could not advance the order');

  if (existing.client_email) {
    sendTradeShipmentStageEmail({
      clientEmail: existing.client_email,
      clientName: existing.client_name,
      shipmentNumber: existing.order_no,
      stage: newStage,
      origin: existing.origin_port,
      destination: existing.destination_port,
      vesselName: existing.carrier || existing.vessel_flight,
      containerNumber: existing.tracking_number,
    }).catch(() => {});
  }
  triggerSync('ferex_trade_orders_change');
  return getTradeOrderById(existing.id);
}

export async function reassignTradeOrder(orderId: string, staffName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  let email = staffEmail || '';
  let id = isUuidStr(staffId) ? staffId : null;
  if (!email || !id) {
    try {
      const staff = await getDivisionStaff('trade');
      const match = staff.find(s => (staffId && s.id === staffId) || s.name === staffName);
      email = email || match?.email || '';
      id = id || (isUuidStr(match?.id) ? match!.id : null);
    } catch {}
  }
  const { data, error } = await supabase.from('trade_orders').update({
    assigned_staff_name: staffName,
    assigned_staff_email: email,
    assigned_staff_id: id,
    updated_at: new Date().toISOString(),
  }).or(orderFilter(orderId)).select('id');
  if (error) tfail(error, 'Could not reassign the order');
  if (!data || data.length === 0) throw new Error('This order no longer exists. Refresh the page.');
  triggerSync('ferex_trade_orders_change');
  return true;
}

export const reassignTradeShipment = reassignTradeOrder;

export async function updateTradeOrder(orderId: string, updates: Partial<TradeOrder>): Promise<TradeOrder | null> {
  const payload = orderPayload(updates);
  // Paid amounts and their statuses are derived from the recorded payments, never typed in.
  for (const k of ['advance_paid', 'advance_status', 'balance_paid', 'balance_status']) delete payload[k];
  const { data, error } = await supabase.from('trade_orders').update({ ...payload, updated_at: new Date().toISOString() }).or(orderFilter(orderId)).select('id');
  if (error) tfail(error, 'Could not update the order');
  if (!data || data.length === 0) throw new Error('This order no longer exists. Refresh the page.');
  triggerSync('ferex_trade_orders_change');
  return getTradeOrderById(data[0].id);
}

export async function deleteTradeOrder(orderId: string): Promise<boolean> {
  const { error } = await supabase.from('trade_orders').delete().or(orderFilter(orderId));
  if (error) tfail(error, 'Could not delete the order');
  triggerSync('ferex_trade_orders_change');
  triggerSync('ferex_trade_documents_change');
  triggerSync('ferex_trade_payments_change');
  return true;
}

// ──────────────────────────────────────────────────────
// 2. DOCUMENTS
// ──────────────────────────────────────────────────────

function normalizeDocStatus(d: any): TradeDocInternalStatus {
  if (d.status) {
    const s = String(d.status).trim().toLowerCase();
    if (s.startsWith('reject')) return 'Rejected';
    if (s.startsWith('verif')) return 'Verified';
    if (s.startsWith('pend')) return 'Pending';
    return 'Submitted';
  }
  if (d.rejection_reason) return 'Rejected';
  return d.is_verified === true ? 'Verified' : 'Submitted';
}

function mapTradeDoc(d: any): TradeDocument {
  const status = normalizeDocStatus(d);
  return {
    id: d.id,
    order_id: d.order_id || undefined,
    order_no: d.order_no || '',
    client_name: d.client_name || '',
    doc_type: d.doc_type || '',
    doc_number: d.doc_number || '',
    file_name: d.document_name || d.file_name || '',
    file_url: d.document_url || d.file_url || '',
    file_size: d.file_size || '',
    status,
    rejection_reason: d.rejection_reason || '',
    notes: d.notes || '',
    uploaded_by: d.uploaded_by || '',
    verified_by: d.verified_by || '',
    verified_at: d.verified_at || undefined,
    sent_to_client: Boolean(d.sent_to_client),
    sent_to_client_at: d.sent_to_client_at || undefined,
    created_at: d.uploaded_at || d.created_at || new Date().toISOString(),
    updated_at: d.updated_at || d.uploaded_at || d.created_at || new Date().toISOString(),
  };
}

export async function getTradeDocuments(orderNo?: string): Promise<TradeDocument[]> {
  let query = supabase.from('trade_documents').select('*').order('uploaded_at', { ascending: false });
  if (orderNo) query = query.eq('order_no', orderNo);
  return ((tok(await query) || []) as any[]).map(mapTradeDoc);
}

async function getTradeDocRow(docId: string): Promise<any> {
  const row = tok(await supabase.from('trade_documents').select('*').eq('id', docId).maybeSingle());
  if (!row) throw new Error('This document no longer exists. Refresh the page.');
  return row;
}

export async function uploadTradeDocument(doc: Partial<TradeDocument>, autoSend?: boolean): Promise<TradeDocument | null> {
  if (!doc.order_no?.trim()) throw new Error('Choose the order this document belongs to');
  if (!doc.doc_type?.trim()) throw new Error('Choose the document type');
  const order = await getTradeOrderById(doc.order_no.trim());
  if (!order) throw new Error(`Order ${doc.order_no} was not found`);
  const isSent = Boolean(autoSend || doc.sent_to_client);
  const requested = (doc.status as TradeDocInternalStatus) || 'Submitted';
  const now = new Date().toISOString();
  const row = tok(
    await supabase.from('trade_documents').insert({
      order_id: order.id,
      order_no: order.order_no,
      client_name: doc.client_name || order.client_name,
      doc_type: doc.doc_type,
      doc_number: doc.doc_number || `DOC-${Math.floor(10000 + Math.random() * 90000)}`,
      document_name: doc.file_name || `${doc.doc_type}.pdf`,
      document_url: doc.file_url || '',
      file_size: doc.file_size || '',
      is_verified: requested === 'Verified',
      status: requested,
      rejection_reason: doc.rejection_reason || null,
      notes: doc.notes || '',
      uploaded_by: doc.uploaded_by || '',
      verified_by: requested === 'Verified' ? (doc.verified_by || doc.uploaded_by || '') : null,
      verified_at: requested === 'Verified' ? now : null,
      sent_to_client: isSent,
      sent_to_client_at: isSent ? now : null,
      uploaded_at: now,
    }).select().single(),
    'Could not save the document'
  );
  const saved = mapTradeDoc(row);
  if (isSent) await notifyDocReady(saved, order.client_email).catch(() => {});
  triggerSync('ferex_trade_documents_change');
  return saved;
}

async function notifyDocReady(doc: TradeDocument, clientEmail?: string) {
  if (!clientEmail) return;
  await triggerTradeAutomatedEmail({
    trigger_type: 'document_ready',
    order_no: doc.order_no,
    recipient_name: doc.client_name,
    recipient_email: clientEmail,
    custom_data: { doc_type: doc.doc_type, doc_number: doc.doc_number },
  });
}

/** A document can be verified only while it is Submitted or Pending. A Rejected document must be re-submitted first. */
export async function verifyTradeDocument(
  docId: string,
  verifiedBy: string = 'Ferex Trade Admin',
  notes?: string
): Promise<TradeDocument | null> {
  const current = normalizeDocStatus(await getTradeDocRow(docId));
  if (current === 'Verified') throw new Error('This document is already verified.');
  if (current === 'Rejected') throw new Error('A rejected document cannot be verified. Ask for a corrected document and re-submit it first.');
  const now = new Date().toISOString();
  const row = tok(
    await supabase.from('trade_documents').update({
      is_verified: true, status: 'Verified', rejection_reason: null, verified_by: verifiedBy, verified_at: now,
      ...(notes ? { notes } : {}), updated_at: now,
    }).eq('id', docId).select().single(),
    'Could not verify the document'
  );
  triggerSync('ferex_trade_documents_change');
  return mapTradeDoc(row);
}

/** A document can be rejected only while it is Submitted or Pending. A Verified document is final unless it is re-opened. */
export async function rejectTradeDocument(
  docId: string,
  reason: string,
  rejectedBy: string = 'Ferex Trade Admin'
): Promise<TradeDocument | null> {
  if (!reason?.trim()) throw new Error('Enter the reason for rejecting this document');
  const current = normalizeDocStatus(await getTradeDocRow(docId));
  if (current === 'Rejected') throw new Error('This document is already rejected.');
  if (current === 'Verified') throw new Error('A verified document cannot be rejected. Re-open it for review first.');
  const now = new Date().toISOString();
  const row = tok(
    await supabase.from('trade_documents').update({
      is_verified: false, status: 'Rejected', rejection_reason: reason.trim(), verified_by: rejectedBy, verified_at: now, updated_at: now,
    }).eq('id', docId).select().single(),
    'Could not reject the document'
  );
  triggerSync('ferex_trade_documents_change');
  return mapTradeDoc(row);
}

/** Re-opens a verified or rejected document (back to Submitted) after a correction or a proper re-verification request. */
export async function reopenTradeDocument(docId: string, notes?: string): Promise<TradeDocument | null> {
  const now = new Date().toISOString();
  const row = tok(
    await supabase.from('trade_documents').update({
      is_verified: false, status: 'Submitted', rejection_reason: null, verified_by: null, verified_at: null,
      ...(notes ? { notes } : {}), updated_at: now,
    }).eq('id', docId).select().maybeSingle(),
    'Could not re-open the document'
  );
  if (!row) throw new Error('This document no longer exists. Refresh the page.');
  triggerSync('ferex_trade_documents_change');
  return mapTradeDoc(row);
}

export async function updateTradeDocument(
  docId: string,
  updates: Partial<TradeDocument>
): Promise<TradeDocument | null> {
  const patch: any = { updated_at: new Date().toISOString() };
  if (updates.doc_type !== undefined) patch.doc_type = updates.doc_type;
  if (updates.doc_number !== undefined) patch.doc_number = updates.doc_number;
  if (updates.file_name !== undefined) patch.document_name = updates.file_name;
  if (updates.file_url !== undefined) patch.document_url = updates.file_url;
  if (updates.file_size !== undefined) patch.file_size = updates.file_size;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.client_name !== undefined) patch.client_name = updates.client_name;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    patch.is_verified = updates.status === 'Verified';
  }
  const row = tok(await supabase.from('trade_documents').update(patch).eq('id', docId).select().maybeSingle(), 'Could not update the document');
  if (!row) throw new Error('This document no longer exists. Refresh the page.');
  triggerSync('ferex_trade_documents_change');
  return mapTradeDoc(row);
}

export async function updateTradeDocumentStatus(
  docId: string,
  status: TradeDocInternalStatus,
  verifiedBy: string = 'Ferex Trade Admin',
  rejectionReason?: string
): Promise<TradeDocument | null> {
  if (status === 'Verified') return verifyTradeDocument(docId, verifiedBy);
  if (status === 'Rejected') return rejectTradeDocument(docId, rejectionReason || 'Compliance document rejected', verifiedBy);
  if (status === 'Submitted' || status === 'Pending') return reopenTradeDocument(docId);
  return updateTradeDocument(docId, { status });
}

export async function sendTradeDocToClient(docId: string): Promise<TradeDocument | null> {
  const row = await getTradeDocRow(docId);
  const order = row.order_no ? await getTradeOrderById(row.order_no) : null;
  if (!order?.client_email) throw new Error('This order has no client email address. Add one to the order first.');
  const now = new Date().toISOString();
  const updated = tok(
    await supabase.from('trade_documents').update({ sent_to_client: true, sent_to_client_at: now, updated_at: now }).eq('id', docId).select().single(),
    'Could not send the document'
  );
  const doc = mapTradeDoc(updated);
  await notifyDocReady(doc, order.client_email).catch(() => {});
  triggerSync('ferex_trade_documents_change');
  return doc;
}

export async function deleteTradeDocument(docId: string): Promise<boolean> {
  const { error } = await supabase.from('trade_documents').delete().eq('id', docId);
  if (error) tfail(error, 'Could not delete the document');
  triggerSync('ferex_trade_documents_change');
  return true;
}

// ─────────────────────────────────────────────────
// 3. OPERATIONAL TASKS & LOGISTICS QUEUE
// ─────────────────────────────────────────────────

const TASK_COLUMNS = ['title', 'category', 'order_no', 'client_name', 'assigned_staff_name', 'assigned_staff_email', 'assigned_staff_id', 'priority', 'status', 'due_date', 'notes'];

export async function getTradeTasks(staffEmail?: string): Promise<TradeTask[]> {
  let query = supabase.from('trade_tasks').select('*').order('due_date', { ascending: true });
  if (staffEmail) {
    const s = orSafe(staffEmail);
    query = query.or(`assigned_staff_email.ilike.%${s}%,assigned_staff_name.ilike.%${s}%`);
  }
  const direct = ((tok(await query) || []) as any[]).map(t => {
    const isCentral = (t.notes || '').toLowerCase().includes('central admin') || (t.title || '').toLowerCase().includes('central admin');
    return { ...t, created_by: isCentral ? 'Central Admin' : 'Trade Admin', is_central_directive: isCentral } as TradeTask;
  });

  // Directives sent by Central Admin live in the shared tasks table.
  let central: TradeTask[] = [];
  try {
    let cQuery = supabase.from('tasks').select('*').ilike('category', '%trade%').order('created_at', { ascending: false });
    if (staffEmail) cQuery = cQuery.ilike('assigned_to', `%${orSafe(staffEmail)}%`);
    const { data: cData } = await cQuery;
    const seen = new Set(direct.map(t => t.id));
    central = ((cData || []) as any[]).filter(c => !seen.has(c.id)).map(c => ({
      id: c.id,
      title: c.title,
      category: 'Order Handling' as const,
      order_no: '',
      client_name: '',
      assigned_staff_name: c.assigned_to || '',
      assigned_staff_email: c.assigned_to && String(c.assigned_to).includes('@') ? c.assigned_to : '',
      assigned_staff_id: c.assigned_staff_id,
      priority: (c.priority === 'Critical' ? 'Urgent' : (c.priority || 'Medium')) as TaskPriority,
      status: (c.status === 'Completed' ? 'Completed' : c.status === 'In Progress' ? 'In Progress' : 'Pending') as TaskStatus,
      due_date: c.due_date || '',
      notes: c.description || '',
      created_by: 'Central Admin',
      is_central_directive: true,
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at,
    }));
  } catch {}
  return [...direct, ...central];
}

export async function createTradeTask(task: Partial<TradeTask>): Promise<TradeTask | null> {
  if (!task.title?.trim()) throw new Error('Task title is required');
  if (!task.assigned_staff_name?.trim()) throw new Error('Choose who this task is assigned to');
  const payload: any = {
    title: task.title.trim(),
    category: task.category || 'Order Handling',
    order_no: task.order_no || '',
    client_name: task.client_name || '',
    assigned_staff_name: task.assigned_staff_name,
    assigned_staff_email: task.assigned_staff_email || '',
    assigned_staff_id: isUuidStr(task.assigned_staff_id) ? task.assigned_staff_id : null,
    priority: task.priority || 'Medium',
    status: task.status || 'Pending',
    due_date: task.due_date || null,
    notes: task.notes || '',
  };
  const data = tok(await supabase.from('trade_tasks').insert(payload).select().single(), 'Could not create the task');
  triggerSync('ferex_trade_tasks_change');
  return data as TradeTask;
}

export async function updateTradeTask(taskId: string, updates: Partial<TradeTask>): Promise<TradeTask | null> {
  const now = new Date().toISOString();
  const patch: any = { updated_at: now };
  for (const k of TASK_COLUMNS) if ((updates as any)[k] !== undefined) patch[k] = (updates as any)[k];
  if (patch.assigned_staff_id !== undefined && !isUuidStr(patch.assigned_staff_id)) patch.assigned_staff_id = null;

  const { data, error } = await supabase.from('trade_tasks').update(patch).eq('id', taskId).select().maybeSingle();
  if (error) tfail(error, 'Could not update the task');
  if (!data) {
    // A Central Admin directive lives in the shared tasks table.
    const shared: any = { updated_at: now };
    if (updates.status) shared.status = updates.status === 'Completed' ? 'Completed' : updates.status === 'In Progress' ? 'In Progress' : 'Pending';
    if (updates.assigned_staff_name) shared.assigned_to = updates.assigned_staff_name;
    const res = await supabase.from('tasks').update(shared).eq('id', taskId).select('id').maybeSingle();
    if (res.error) tfail(res.error, 'Could not update the task');
    if (!res.data) throw new Error('This task no longer exists. Refresh the page.');
  } else {
    // Mirror to the shared tasks table when a Central directive was linked to it (best effort).
    const mirror: any = { updated_at: now };
    if (updates.status) mirror.status = updates.status === 'Completed' ? 'Completed' : updates.status === 'In Progress' ? 'In Progress' : 'Pending';
    await supabase.from('tasks').update(mirror).eq('id', taskId);
  }
  triggerSync('ferex_trade_tasks_change');
  triggerSync('ferex_tasks_change');
  return (data as TradeTask) || null;
}

export async function deleteTradeTask(taskId: string): Promise<boolean> {
  const a = await supabase.from('trade_tasks').delete().eq('id', taskId);
  if (a.error) tfail(a.error, 'Could not delete the task');
  await supabase.from('tasks').delete().eq('id', taskId);
  triggerSync('ferex_trade_tasks_change');
  triggerSync('ferex_tasks_change');
  return true;
}

// ─────────────────────────────────────────────────
// 4. TICKETS & ISSUE RESOLUTION
// ─────────────────────────────────────────────────

const TICKET_COLUMNS = ['ticket_no', 'client_name', 'client_contact', 'order_no', 'channel', 'subject', 'description', 'priority', 'status',
  'assigned_staff_name', 'assigned_staff_email', 'assigned_staff_id', 'resolution_notes', 'logged_by'];

export async function getTradeTickets(staffEmail?: string): Promise<TradeTicket[]> {
  let query = supabase.from('trade_tickets').select('*').order('created_at', { ascending: false });
  if (staffEmail) {
    const s = orSafe(staffEmail);
    query = query.or(`assigned_staff_email.ilike.%${s}%,assigned_staff_name.ilike.%${s}%`);
  }
  return (tok(await query) || []) as TradeTicket[];
}

export async function createTradeTicket(ticket: Partial<TradeTicket>): Promise<TradeTicket | null> {
  if (!ticket.subject?.trim()) throw new Error('Enter the ticket subject');
  if (!ticket.client_name?.trim()) throw new Error('Enter the client name');
  const payload: any = {
    ticket_no: ticket.ticket_no || `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    client_name: ticket.client_name.trim(),
    client_contact: ticket.client_contact || '',
    order_no: ticket.order_no || '',
    channel: ticket.channel || 'Email',
    subject: ticket.subject.trim(),
    description: ticket.description || '',
    priority: ticket.priority || 'Medium',
    status: ticket.status || 'Open',
    assigned_staff_name: ticket.assigned_staff_name || '',
    assigned_staff_email: ticket.assigned_staff_email || '',
    assigned_staff_id: isUuidStr(ticket.assigned_staff_id) ? ticket.assigned_staff_id : null,
    resolution_notes: ticket.resolution_notes || '',
    logged_by: ticket.logged_by || '',
  };
  const data = tok(await supabase.from('trade_tickets').insert(payload).select().single(), 'Could not save the ticket');
  triggerSync('ferex_trade_tickets_change');
  return data as TradeTicket;
}

export async function updateTradeTicket(ticketId: string, updates: Partial<TradeTicket>): Promise<TradeTicket | null> {
  const patch: any = { updated_at: new Date().toISOString() };
  for (const k of TICKET_COLUMNS) if ((updates as any)[k] !== undefined) patch[k] = (updates as any)[k];
  if (patch.assigned_staff_id !== undefined && !isUuidStr(patch.assigned_staff_id)) patch.assigned_staff_id = null;
  const data = tok(await supabase.from('trade_tickets').update(patch).eq('id', ticketId).select().maybeSingle(), 'Could not update the ticket');
  if (!data) throw new Error('This ticket no longer exists. Refresh the page.');
  triggerSync('ferex_trade_tickets_change');
  return data as TradeTicket;
}

export async function resolveTradeTicket(
  ticketId: string,
  resolutionNotes: string,
  resolvedBy: string = 'Trade Admin'
): Promise<TradeTicket | null> {
  return updateTradeTicket(ticketId, {
    status: 'Resolved',
    resolution_notes: `${resolutionNotes} (Resolved by ${resolvedBy})`
  });
}

export async function updateTradeTicketStatus(
  ticketId: string,
  status: TicketStatus,
  resolutionNotes?: string
): Promise<TradeTicket | null> {
  const updates: Partial<TradeTicket> = { status };
  if (resolutionNotes) updates.resolution_notes = resolutionNotes;
  return updateTradeTicket(ticketId, updates);
}

/** Deletes a ticket. Throws if the database refuses or the ticket was not actually removed. */
export async function deleteTradeTicket(ticketId: string): Promise<boolean> {
  const { data, error } = await supabase.from('trade_tickets').delete().eq('id', ticketId).select('id');
  if (error) tfail(error, 'Could not delete the ticket');
  if (!data || data.length === 0) {
    // Nothing was removed: it is either already gone or the database refused to delete it for this user.
    const still = await supabase.from('trade_tickets').select('id').eq('id', ticketId).maybeSingle();
    if (still.data) throw new Error('The ticket could not be deleted (permission denied).');
  }
  triggerSync('ferex_trade_tickets_change');
  return true;
}

// ─────────────────────────────────────────────────
// 5. PAYMENTS & FINANCIAL SETTLEMENT
// ─────────────────────────────────────────────────

export async function getTradePayments(orderNo?: string): Promise<TradePaymentRecord[]> {
  let query = supabase.from('trade_payments').select('*').order('payment_date', { ascending: false }).order('created_at', { ascending: false });
  if (orderNo) query = query.eq('order_no', orderNo);
  return ((tok(await query) || []) as any[]).map(p => ({ ...p, amount: tnum(p.amount), currency: p.currency || '' }));
}

export async function createTradePayment(payment: Partial<TradePaymentRecord>): Promise<TradePaymentRecord | null> {
  const amt = Number(payment.amount);
  if (!(amt > 0)) throw new Error('Enter an amount greater than zero');
  const orderNo = payment.order_no?.trim();
  if (!orderNo) throw new Error('Choose the order this payment is for');
  const order = await getTradeOrderById(orderNo);
  if (!order) throw new Error(`Order ${orderNo} was not found`);

  const type = payment.type || 'Advance Payment';
  const isAdvance = String(type).toLowerCase().includes('advance');
  const currency = payment.currency || order.currency;
  if (currency !== order.currency) {
    throw new Error(`This order is in ${order.currency}. Record the payment in ${order.currency} (convert it first if it was received in ${currency}).`);
  }
  const outstanding = isAdvance ? order.advance_amount - order.advance_paid : order.balance_amount - order.balance_paid;
  if (amt > outstanding + 0.005) {
    throw new Error(`Amount exceeds the ${isAdvance ? 'advance' : 'balance'} still due on this order (${order.currency} ${outstanding.toLocaleString('en-IN')}).`);
  }

  const data = tok(
    await supabase.from('trade_payments').insert({
      order_no: order.order_no,
      order_id: order.id,
      client_name: order.client_name,
      client_id: order.client_id || null,
      type,
      amount: amt,
      currency,
      payment_method: payment.payment_method || 'Bank Wire / SWIFT',
      transaction_ref: payment.transaction_ref || '',
      lc_reference: payment.lc_reference || '',
      invoice_no: payment.invoice_no || null,
      receipt_no: payment.receipt_no || `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      notes: payment.notes || '',
    }).select().single(),
    'Could not record the payment'
  ) as any;

  if (order.client_email) {
    triggerTradeAutomatedEmail({
      trigger_type: 'payment_received',
      order_no: order.order_no,
      recipient_name: order.client_name,
      recipient_email: order.client_email,
      custom_data: { amount: data.amount, currency: data.currency, receipt_no: data.receipt_no },
    }).catch(() => {});
  }
  triggerSync('ferex_trade_payments_change');
  triggerSync('ferex_trade_orders_change');
  return { ...data, amount: tnum(data.amount) } as TradePaymentRecord;
}

/** Deletes a payment. The order's paid amounts are derived from the remaining payments, so they correct themselves. */
export async function deleteTradePayment(paymentId: string): Promise<boolean> {
  const { error } = await supabase.from('trade_payments').delete().eq('id', paymentId);
  if (error) tfail(error, 'Could not delete the payment');
  triggerSync('ferex_trade_payments_change');
  triggerSync('ferex_trade_orders_change');
  return true;
}

// ─────────────────────────────────────────────────
// 6. CLIENT PARTNERS & CRM DIRECTORY
// ─────────────────────────────────────────────────

function mapTradeClient(c: any): TradeClientPartner {
  return {
    id: c.id,
    company_name: c.company_name || '',
    contact_person: c.contact_person || '',
    email: c.email || '',
    phone: c.phone || '',
    country: c.country || '',
    city: c.city || '',
    category: c.category || 'Buyer / Importer',
    vat_number: c.vat_number || '',
    payment_terms: c.payment_terms || '',
    credit_limit: tnum(c.credit_limit),
    portal_active: c.portal_active !== false,
    notes: c.notes || '',
    created_at: c.created_at,
    updated_at: c.updated_at || c.created_at,
  };
}

const CLIENT_COLUMNS = ['company_name', 'contact_person', 'email', 'phone', 'country', 'city', 'category', 'vat_number', 'payment_terms', 'credit_limit', 'portal_active', 'notes'];

export async function getTradeClients(search?: string): Promise<TradeClientPartner[]> {
  let list = ((tok(await supabase.from('trade_clients').select('*').order('company_name', { ascending: true })) || []) as any[]).map(mapTradeClient);
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(c =>
      c.company_name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.vat_number || '').toLowerCase().includes(q)
    );
  }
  return list;
}

export const getTradeCRMContacts = getTradeClients;

export async function createTradeClient(client: Partial<TradeClientPartner>): Promise<TradeClientPartner | null> {
  if (!client.company_name?.trim()) throw new Error('Company name is required');
  if (!client.email?.trim()) throw new Error('Client email is required');
  const payload: any = {
    company_name: client.company_name.trim(),
    contact_person: client.contact_person?.trim() || client.company_name.trim(),
    email: client.email.trim(),
    phone: client.phone?.trim() || '',
    country: client.country?.trim() || '',
    city: client.city?.trim() || '',
    category: client.category || 'Buyer / Importer',
    vat_number: client.vat_number?.trim() || '',
    payment_terms: client.payment_terms?.trim() || '',
    credit_limit: Number(client.credit_limit) || 0,
    portal_active: client.portal_active !== false,
    notes: client.notes || '',
    status: 'Active',
  };
  const data = tok(await supabase.from('trade_clients').insert(payload).select().single(), 'Could not save the client');
  triggerSync('ferex_trade_clients_change');
  triggerSync('ferex_trade_crm_change');
  return mapTradeClient(data);
}

export async function updateTradeClient(
  clientId: string,
  updates: Partial<TradeClientPartner>
): Promise<TradeClientPartner | null> {
  const patch: any = { updated_at: new Date().toISOString() };
  for (const k of CLIENT_COLUMNS) if ((updates as any)[k] !== undefined) patch[k] = (updates as any)[k];
  const data = tok(await supabase.from('trade_clients').update(patch).eq('id', clientId).select().maybeSingle(), 'Could not update the client');
  if (!data) throw new Error('This client no longer exists. Refresh the page.');
  triggerSync('ferex_trade_clients_change');
  triggerSync('ferex_trade_crm_change');
  return mapTradeClient(data);
}

export async function deleteTradeClient(clientId: string): Promise<boolean> {
  const { error } = await supabase.from('trade_clients').delete().eq('id', clientId);
  if (error) tfail(error, 'Could not delete the client');
  triggerSync('ferex_trade_clients_change');
  triggerSync('ferex_trade_crm_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. NOTIFICATIONS & AUTOMATED EMAIL LOGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeNotifications(): Promise<TradeAutomatedEmail[]> {
  try {
    let dbNotifs: TradeAutomatedEmail[] = [];
    try {
      const { data, error } = await supabase
        .from('trade_notifications')
        .select('*')
        .order('sent_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbNotifs = data.map((n: any) => ({
          id: n.id,
          trigger_type: n.trigger_type || 'order_confirmed',
          trigger_label: n.trigger_label || 'Trade Notification',
          order_no: n.order_no || 'TRD-CONSIGNMENT',
          recipient_name: n.recipient_name || 'Trade Partner',
          recipient_email: n.recipient_email || 'partner@trade.com',
          subject: n.subject || 'Consignment Status Update',
          content_preview: n.content_preview || '',
          sent_at: n.sent_at || n.created_at || new Date().toISOString(),
          status: n.status || 'Sent'
        }));
      }
    } catch {}

    // Also load from central email_logs with division='trade'
    let emailLogsList: TradeAutomatedEmail[] = [];
    try {
      const { data: logsData } = await supabase
        .from('email_logs')
        .select('*')
        .eq('division', 'trade')
        .order('sent_at', { ascending: false });

      if (Array.isArray(logsData)) {
        emailLogsList = logsData.map((l: any) => ({
          id: l.id,
          trigger_type: (l.template_type?.replace('trade_', '') as any) || 'order_confirmed',
          trigger_label: l.template_type ? l.template_type.replace(/_/g, ' ').toUpperCase() : 'Automated Dispatch',
          order_no: l.reference_id || 'TRD-LIVE',
          recipient_name: l.recipient_name || l.recipient_email?.split('@')[0] || 'Trade Client',
          recipient_email: l.recipient_email,
          subject: l.subject || 'Trade Status Notification',
          content_preview: l.error_message ? `Dispatch note: ${l.error_message}` : `Automated email delivered via ${l.dispatch_mode || 'system'}`,
          sent_at: l.sent_at || l.created_at || new Date().toISOString(),
          status: (l.status === 'delivered' ? 'Delivered' : l.status === 'failed' ? 'Failed' : 'Sent') as any
        }));
      }
    } catch {}

    const map = new Map<string, TradeAutomatedEmail>();
    dbNotifs.forEach(n => map.set(n.id, n));
    emailLogsList.forEach(l => {
      if (!map.has(l.id)) map.set(l.id, l);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime()
    );
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeNotifications:', err);
    return [];
  }
}

export const getTradeAutomatedEmails = getTradeNotifications;

export async function triggerTradeAutomatedEmail(payload: {
  trigger_type: AutomatedEmailTrigger;
  order_no: string;
  recipient_name: string;
  recipient_email: string;
  custom_data?: any;
}): Promise<TradeAutomatedEmail | null> {
  try {
    const labels: Record<AutomatedEmailTrigger, { label: string; subject: string; preview: string }> = {
      order_confirmed: {
        label: 'Order Confirmed Notice',
        subject: `[FEREX TRADE] Order Confirmation & Sourcing Notice: ${payload.order_no}`,
        preview: `Your international trade order ${payload.order_no} has been confirmed and scheduled for port delivery.`
      },
      document_ready: {
        label: 'Compliance Document Ready',
        subject: `[FEREX TRADE] Shipping Document Verified: ${payload.order_no}`,
        preview: `Verified compliance document (${payload.custom_data?.doc_type || 'Shipping Doc'}) is available for download.`
      },
      invoice_generated: {
        label: 'Commercial Invoice Issued',
        subject: `[FEREX TRADE] Commercial Invoice Dossier: ${payload.order_no}`,
        preview: `Commercial invoice and payment instructions generated for order ${payload.order_no}.`
      },
      payment_received: {
        label: 'Payment Receipt Confirmation',
        subject: `[FEREX TRADE] Payment Received & Credited: ${payload.order_no}`,
        preview: `Payment of ${payload.custom_data?.currency || 'USD'} ${Number(payload.custom_data?.amount || 0).toLocaleString()} credited under receipt #${payload.custom_data?.receipt_no || 'REC'}.`
      },
      payment_reminder: {
        label: 'Balance Settlement Reminder',
        subject: `[FEREX TRADE] Action Required: Balance Payment for ${payload.order_no}`,
        preview: `Reminder for balance wire settlement against shipping Bill of Lading.`
      },
      shipped: {
        label: 'Ocean Vessel Dispatch Notice',
        subject: `[FEREX TRADE] Cargo Loaded & In Transit: ${payload.order_no}`,
        preview: `Vessel ${payload.custom_data?.vessel || 'Carrier'} departed. Container tracking: ${payload.custom_data?.tracking || 'Active'}. ETA: ${payload.custom_data?.eta || 'Scheduled'}.`
      },
      customs_cleared: {
        label: 'Customs & Port Clearance Notice',
        subject: `[FEREX TRADE] Port Terminal Clearance Completed: ${payload.order_no}`,
        preview: `Import customs verification completed. Cargo released for consignee gate pass.`
      },
      delivered: {
        label: 'Consignment Delivery Sign-off',
        subject: `[FEREX TRADE] Cargo Delivered & Closed: ${payload.order_no}`,
        preview: `Shipment ${payload.order_no} has been successfully delivered and received at destination.`
      }
    };

    const triggerInfo = labels[payload.trigger_type] || {
      label: 'Trade Notification',
      subject: `[FEREX TRADE] Notification for ${payload.order_no}`,
      preview: `Status update recorded for ${payload.order_no}.`
    };

    const newRecord = {
      trigger_type: payload.trigger_type,
      trigger_label: triggerInfo.label,
      order_no: payload.order_no,
      recipient_name: payload.recipient_name,
      recipient_email: payload.recipient_email,
      subject: triggerInfo.subject,
      content_preview: triggerInfo.preview,
      sent_at: new Date().toISOString(),
      status: 'Sent'
    };

    // Dispatch real email through enterprise email pipeline
    if (payload.recipient_email) {
      try {
        await sendStudentEmail({
          studentEmail: payload.recipient_email,
          studentName: payload.recipient_name,
          subject: triggerInfo.subject,
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); padding: 24px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 18px; font-weight: 700;">FEREX GLOBAL TRADE</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #99f6e4;">International Trade Logistics & Compliance Desk</p>
              </div>
              <div style="padding: 24px; color: #1e293b;">
                <h2 style="margin-top: 0; font-size: 16px; color: #0f766e;">${triggerInfo.label}</h2>
                <p style="font-size: 14px; line-height: 1.5;">Dear <strong>${payload.recipient_name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.5;">${triggerInfo.preview}</p>
                <div style="background: #f0fdfa; border-left: 4px solid #0f766e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px;"><strong>Consignment No:</strong> ${payload.order_no}</p>
                </div>
              </div>
              <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b;">
                FEREX VENTURES • Global Trade & Maritime Freight Desk
              </div>
            </div>
          `,
          templateType: `trade_${payload.trigger_type}`,
          division: 'trade',
          referenceId: payload.order_no
        });
      } catch (emailErr) {
        console.warn('[TradeAPI] Automated email dispatch notice:', emailErr);
      }
    }

    try {
      const { data } = await supabase
        .from('trade_notifications')
        .insert([newRecord])
        .select()
        .single();
      triggerSync('ferex_trade_emails_change');
      if (data) return data;
    } catch {}

    triggerSync('ferex_trade_emails_change');
    return newRecord as any;
  } catch (err) {
    console.error('[TradeAPI] Error triggering automated email:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TELEMETRY, DASHBOARD METRICS & GLOBAL SEARCH
// ─────────────────────────────────────────────────────────────────────────────

export interface CentralTradeSummary {
  totalOrdersCount: number;
  totalOrderBookValueUSD: number;
  totalAdvancePaidUSD: number;
  totalBalanceOutstandingUSD: number;
  activeShipmentsCount: number;
  deliveredOrdersCount: number;
  pendingComplianceDocsCount: number;
  verifiedDocsCount: number;
  openTasksCount: number;
  urgentTasksCount: number;
  openTicketsCount: number;
  totalClientsCount: number;
  stageBreakdown: Record<TradeOrderStage, number>;
}

export async function getCentralTradeSummary(staffEmail?: string): Promise<CentralTradeSummary> {
  try {
    const [orders, docs, tasks, tickets, clients] = await Promise.all([
      getTradeOrders(staffEmail),
      getTradeDocuments(),
      getTradeTasks(staffEmail),
      getTradeTickets(staffEmail),
      getTradeClients()
    ]);

    let totalVal = 0;
    let advPaid = 0;
    let balOut = 0;
    let activeShip = 0;
    let delivered = 0;

    const stageMap: Record<TradeOrderStage, number> = {
      'Inquiry': 0,
      'Quote Sent': 0,
      'Order Confirmed': 0,
      'Production/Sourcing': 0,
      'Shipped': 0,
      'Customs Clearance': 0,
      'Delivered': 0
    };

    for (const ord of orders) {
      totalVal += Number(ord.total_amount || 0);
      advPaid += Number(ord.advance_paid || 0);
      balOut += (Number(ord.total_amount || 0) - Number(ord.advance_paid || 0) - Number(ord.balance_paid || 0));

      if (ord.stage === 'Shipped' || ord.stage === 'Customs Clearance') {
        activeShip += 1;
      }
      if (ord.stage === 'Delivered') {
        delivered += 1;
      }
      if (stageMap[ord.stage] !== undefined) {
        stageMap[ord.stage] += 1;
      }
    }

    const pendingDocs = docs.filter(d => d.status === 'Pending' || d.status === 'Submitted').length;
    const verifiedDocs = docs.filter(d => d.status === 'Verified').length;
    const openTasks = tasks.filter(t => t.status !== 'Completed').length;
    const urgentTasks = tasks.filter(t => t.status !== 'Completed' && (t.priority === 'Urgent' || t.priority === 'High')).length;
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

    return {
      totalOrdersCount: orders.length,
      totalOrderBookValueUSD: totalVal,
      totalAdvancePaidUSD: advPaid,
      totalBalanceOutstandingUSD: Math.max(0, balOut),
      activeShipmentsCount: activeShip,
      deliveredOrdersCount: delivered,
      pendingComplianceDocsCount: pendingDocs,
      verifiedDocsCount: verifiedDocs,
      openTasksCount: openTasks,
      urgentTasksCount: urgentTasks,
      openTicketsCount: openTickets,
      totalClientsCount: clients.length,
      stageBreakdown: stageMap
    };
  } catch (err) {
    console.error('[TradeAPI] Error calculating trade summary:', err);
    return {
      totalOrdersCount: 0,
      totalOrderBookValueUSD: 0,
      totalAdvancePaidUSD: 0,
      totalBalanceOutstandingUSD: 0,
      activeShipmentsCount: 0,
      deliveredOrdersCount: 0,
      pendingComplianceDocsCount: 0,
      verifiedDocsCount: 0,
      openTasksCount: 0,
      urgentTasksCount: 0,
      openTicketsCount: 0,
      totalClientsCount: 0,
      stageBreakdown: {
        'Inquiry': 0,
        'Quote Sent': 0,
        'Order Confirmed': 0,
        'Production/Sourcing': 0,
        'Shipped': 0,
        'Customs Clearance': 0,
        'Delivered': 0
      }
    };
  }
}

export async function globalSearchTrade(query: string): Promise<any[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  try {
    const [orders, docs, tasks, clients, tickets] = await Promise.all([
      getTradeOrders(),
      getTradeDocuments(),
      getTradeTasks(),
      getTradeClients(),
      getTradeTickets()
    ]);

    const results: any[] = [];

    orders.forEach(o => {
      if (
        o.order_no.toLowerCase().includes(q) ||
        o.client_name.toLowerCase().includes(q) ||
        o.commodity.toLowerCase().includes(q) ||
        (o.carrier || '').toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Order',
          title: `${o.order_no} • ${o.commodity}`,
          subtitle: `${o.client_name} • Stage: ${o.stage}`,
          link: '/trade/shipments',
          badge: o.stage
        });
      }
    });

    docs.forEach(d => {
      if (
        d.doc_type.toLowerCase().includes(q) ||
        (d.doc_number || '').toLowerCase().includes(q) ||
        d.order_no.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Document',
          title: `${d.doc_type} (${d.doc_number || d.file_name})`,
          subtitle: `Order ${d.order_no} • ${d.status}`,
          link: '/trade/documents',
          badge: d.status
        });
      }
    });

    tasks.forEach(t => {
      if (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.order_no || '').toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Task',
          title: t.title,
          subtitle: `Assignee: ${t.assigned_staff_name} • Priority: ${t.priority}`,
          link: '/trade/tasks',
          badge: t.status
        });
      }
    });

    clients.forEach(c => {
      if (
        c.company_name.toLowerCase().includes(q) ||
        c.contact_person.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Client',
          title: c.company_name,
          subtitle: `${c.contact_person} • ${c.country} (${c.category})`,
          link: '/trade/crm',
          badge: c.category
        });
      }
    });

    tickets.forEach(tk => {
      if (
        tk.ticket_no.toLowerCase().includes(q) ||
        tk.subject.toLowerCase().includes(q) ||
        tk.client_name.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Ticket',
          title: `${tk.ticket_no} • ${tk.subject}`,
          subtitle: `${tk.client_name} • Status: ${tk.status}`,
          link: '/trade/tickets',
          badge: tk.priority
        });
      }
    });

    return results.slice(0, 12);
  } catch (err) {
    console.error('[TradeAPI] Error in globalSearchTrade:', err);
    return [];
  }
}

export async function getTradeDossier(orderNoOrType: string, docId?: string): Promise<{
  order: TradeOrder | null;
  documents: TradeDocument[];
  payments: TradePaymentRecord[];
  tasks: TradeTask[];
  tickets: TradeTicket[];
}> {
  const orderNo = docId || orderNoOrType;
  const [order, documents, payments, tasks, tickets] = await Promise.all([
    getTradeOrderById(orderNo),
    getTradeDocuments(orderNo),
    getTradePayments(orderNo),
    getTradeTasks(),
    getTradeTickets()
  ]);

  return {
    order,
    documents,
    payments,
    tasks: tasks.filter(t => t.order_no === orderNo),
    tickets: tickets.filter(tk => tk.order_no === orderNo)
  };
}

export const createTradeCRMContact = createTradeClient;
export const updateTradeCRMContact = updateTradeClient;
export const deleteTradeCRMContact = deleteTradeClient;

export async function sendPaymentReminder(
  paymentIdOrOrderNo: string,
  clientName?: string,
  email?: string
): Promise<boolean> {
  try {
    let orderNo = paymentIdOrOrderNo;
    let recipientName = clientName || 'Trade Partner';
    let recipientEmail = email || 'partner@trade.com';

    if (!clientName || !email) {
      const orders = await getTradeOrders();
      const matched = orders.find(o => o.order_no === orderNo || o.id === orderNo);
      if (matched) {
        orderNo = matched.order_no;
        recipientName = matched.client_name;
        recipientEmail = matched.client_email;
      }
    }

    await triggerTradeAutomatedEmail({
      trigger_type: 'payment_reminder',
      order_no: orderNo,
      recipient_name: recipientName,
      recipient_email: recipientEmail
    });
    return true;
  } catch {
    return false;
  }
}

export const recordTradePayment = createTradePayment;

export async function updateTradeTaskStatus(taskId: string, status: TradeTask['status']): Promise<TradeTask | null> {
  return updateTradeTask(taskId, { status });
}

export async function reassignTradeTask(taskId: string, assignedTo: string, ..._rest: any[]): Promise<TradeTask | null> {
  return updateTradeTask(taskId, { assigned_staff_name: assignedTo, assigned_to: assignedTo });
}

export async function reassignTradeTicket(ticketId: string, assignedTo: string, ..._rest: any[]): Promise<TradeTicket | null> {
  return updateTradeTicket(ticketId, { assigned_staff_name: assignedTo, assigned_to: assignedTo });
}

// ─────────────────────────────────────────────────
// CLIENT & ADMIN CHAT (stored in the database)
// ─────────────────────────────────────────────────

export async function getTradeMessages(conversationId?: string): Promise<TradeChatMessage[]> {
  let query = supabase.from('trade_messages').select('*').order('created_at', { ascending: true });
  if (conversationId) query = query.eq('conversation_id', conversationId);
  return (tok(await query) || []) as TradeChatMessage[];
}

export async function sendTradeMessage(msg: Partial<TradeChatMessage>): Promise<TradeChatMessage> {
  if (!msg.message?.trim()) throw new Error('Type a message first');
  const data = tok(
    await supabase.from('trade_messages').insert({
      conversation_id: msg.conversation_id || 'client_portal',
      contact_name: msg.contact_name || 'Trade Partner',
      contact_role: msg.contact_role || null,
      sender_name: msg.sender_name || 'Operations Officer',
      message: msg.message.trim(),
      is_self: Boolean(msg.is_self),
    }).select().single(),
    'Could not send the message'
  );
  triggerSync('ferex_trade_messages_change');
  return data as TradeChatMessage;
}


// ─────────────────────────────────────────────────
// TRADE DOCUMENT RECORDS: invoices, letters of credit, bills of lading, packing lists, certificates.
// Each is a real record in its own table, tied to an order.
// ─────────────────────────────────────────────────

/** Finds the order a record belongs to by order number (or id). */
async function requireTradeOrder(ref?: string): Promise<TradeOrder> {
  if (!ref?.trim()) throw new Error('Choose the shipment / order this record belongs to');
  const order = await getTradeOrderById(ref.trim());
  if (!order) throw new Error(`Order ${ref} was not found`);
  return order;
}

const nextNo = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
const dateOrNull = (v?: string | null) => (v && String(v).trim() ? String(v).slice(0, 10) : null);

// ── Invoices ──

function invoiceStatus(row: any, paid: number): string {
  if (row.status === 'Draft' || row.status === 'Cancelled') return row.status;
  const amount = tnum(row.amount);
  if (amount > 0 && paid >= amount) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  if (row.due_date && new Date(row.due_date).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime()) return 'Overdue';
  return 'Issued';
}

export async function getTradeInvoices(): Promise<TradeInvoiceRecord[]> {
  const [rows, pays] = await Promise.all([
    supabase.from('trade_invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('trade_payments').select('invoice_no, amount').not('invoice_no', 'is', null),
  ]);
  const paidBy = new Map<string, number>();
  for (const p of (pays.data || []) as any[]) paidBy.set(p.invoice_no, (paidBy.get(p.invoice_no) || 0) + tnum(p.amount));
  return ((tok(rows) || []) as any[]).map(r => {
    const paid = paidBy.get(r.invoice_no) || 0;
    const amount = tnum(r.amount);
    return {
      id: r.id,
      invoice_no: r.invoice_no,
      invoice_number: r.invoice_no,
      order_no: r.order_no,
      shipment_no: r.order_no,
      client_name: r.client_name,
      buyer_name: r.buyer_name,
      seller_name: r.seller_name,
      issue_date: r.issue_date || '',
      due_date: r.due_date || '',
      amount,
      subtotal: tnum(r.subtotal),
      freight_charges: tnum(r.freight_charges),
      insurance_charges: tnum(r.insurance_charges),
      tax_charges: tnum(r.tax_charges),
      payment_terms: r.payment_terms,
      lc_reference: r.lc_reference,
      currency: r.currency,
      incoterm: r.incoterms,
      incoterms: r.incoterms,
      status: invoiceStatus(r, paid),
      paid_amount: paid,
      amount_paid: paid,
      outstanding_amount: Math.max(0, amount - paid),
      notes: r.notes,
      items: Array.isArray(r.items) ? r.items : [],
      created_at: r.created_at,
    } as any;
  });
}

export async function createTradeInvoice(invoice: Partial<TradeInvoiceRecord> & Record<string, any>): Promise<any> {
  const order = await requireTradeOrder(invoice.order_no || invoice.shipment_no);
  const amount = Number(invoice.amount);
  if (!(amount > 0)) throw new Error('Enter the invoice amount');
  if (!invoice.buyer_name?.trim()) throw new Error('Enter the buyer');
  const row = tok(
    await supabase.from('trade_invoices').insert({
      invoice_no: invoice.invoice_number || invoice.invoice_no || nextNo('INV'),
      order_id: order.id,
      order_no: order.order_no,
      client_name: order.client_name,
      buyer_name: invoice.buyer_name.trim(),
      seller_name: invoice.seller_name || '',
      invoice_type: invoice.invoice_type === 'Proforma' ? 'Proforma' : 'Commercial',
      incoterms: invoice.incoterms || invoice.incoterm || String(order.incoterm || ''),
      currency: order.currency,
      subtotal: Number(invoice.subtotal) || amount,
      freight_charges: Number(invoice.freight_charges) || 0,
      insurance_charges: Number(invoice.insurance_charges) || 0,
      tax_charges: Number(invoice.tax_charges) || 0,
      amount,
      payment_terms: invoice.payment_terms || '',
      lc_reference: invoice.lc_reference || '',
      items: invoice.items || [],
      issue_date: dateOrNull(invoice.issue_date) || new Date().toISOString().slice(0, 10),
      due_date: dateOrNull(invoice.due_date),
      status: invoice.status === 'Draft' ? 'Draft' : 'Issued',
      notes: invoice.notes || '',
    }).select().single(),
    'Could not save the invoice'
  ) as any;
  triggerSync('ferex_trade_invoices_change');
  return { ...row, invoice_number: row.invoice_no };
}

export async function updateTradeInvoiceStatus(id: string, status: string): Promise<any> {
  // Paid / Partially Paid / Overdue follow from the recorded payments and the due date; only Draft, Issued and Cancelled are set by hand.
  if (!['Draft', 'Issued', 'Cancelled'].includes(status)) {
    throw new Error('Payment status follows the recorded payments. Record a payment against this invoice instead.');
  }
  const row = tok(await supabase.from('trade_invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(), 'Could not update the invoice');
  if (!row) throw new Error('This invoice no longer exists. Refresh the page.');
  triggerSync('ferex_trade_invoices_change');
  return row;
}

export async function deleteTradeInvoice(id: string): Promise<boolean> {
  const { error } = await supabase.from('trade_invoices').delete().eq('id', id);
  if (error) tfail(error, 'Could not delete the invoice');
  triggerSync('ferex_trade_invoices_change');
  return true;
}

// ── Letters of credit ──

export async function getTradeLettersOfCredit(): Promise<TradeLetterOfCreditRecord[]> {
  const rows = tok(await supabase.from('trade_letters_of_credit').select('*').order('created_at', { ascending: false })) as any[];
  return (rows || []).map(r => ({
    ...r,
    shipment_no: r.order_no,
    amount: tnum(r.amount),
    expiry_date: r.expiry_date || '',
    issue_date: r.issue_date || '',
  })) as any;
}

export async function createTradeLetterOfCredit(lc: Partial<TradeLetterOfCreditRecord> & Record<string, any>): Promise<any> {
  const order = await requireTradeOrder(lc.order_no || lc.shipment_no);
  const amount = Number(lc.amount);
  if (!(amount > 0)) throw new Error('Enter the LC amount');
  if (!lc.issuing_bank?.trim()) throw new Error('Enter the issuing bank');
  if (!lc.beneficiary?.trim()) throw new Error('Enter the beneficiary');
  if (lc.expiry_date && new Date(lc.expiry_date) < new Date(new Date().toISOString().slice(0, 10))) throw new Error('The LC expiry date is in the past');
  const row = tok(
    await supabase.from('trade_letters_of_credit').insert({
      lc_number: lc.lc_number || nextNo('LC'),
      order_id: order.id,
      order_no: order.order_no,
      invoice_no: lc.invoice_no || '',
      lc_type: lc.lc_type || '',
      applicant: lc.applicant || order.client_name,
      beneficiary: lc.beneficiary.trim(),
      issuing_bank: lc.issuing_bank.trim(),
      advising_bank: lc.advising_bank || '',
      amount,
      currency: lc.currency || order.currency,
      expiry_date: dateOrNull(lc.expiry_date),
      status: lc.status || 'Issued',
      notes: lc.notes || '',
    }).select().single(),
    'Could not save the Letter of Credit'
  );
  // Link the LC reference onto the order so it shows in payments and the order detail.
  await supabase.from('trade_orders').update({ lc_reference: (row as any).lc_number, updated_at: new Date().toISOString() }).eq('id', order.id);
  triggerSync('ferex_trade_lcs_change');
  triggerSync('ferex_trade_orders_change');
  return row;
}

export async function updateTradeLetterOfCreditStatus(id: string, status: string, notes?: string): Promise<any> {
  const row = tok(
    await supabase.from('trade_letters_of_credit').update({ status, ...(notes ? { notes } : {}), updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the Letter of Credit'
  );
  if (!row) throw new Error('This Letter of Credit no longer exists. Refresh the page.');
  triggerSync('ferex_trade_lcs_change');
  return row;
}

export async function deleteTradeLetterOfCredit(id: string): Promise<boolean> {
  const { error } = await supabase.from('trade_letters_of_credit').delete().eq('id', id);
  if (error) tfail(error, 'Could not delete the Letter of Credit');
  triggerSync('ferex_trade_lcs_change');
  return true;
}

// ── Bills of lading ──

export async function getTradeBillsOfLading(): Promise<TradeBillOfLadingRecord[]> {
  const rows = tok(await supabase.from('trade_bills_of_lading').select('*').order('created_at', { ascending: false })) as any[];
  return (rows || []).map(r => ({
    ...r,
    shipment_no: r.order_no,
    voyage_number: r.voyage_no,
    gross_weight_kg: tnum(r.gross_weight_kg),
    total_packages: tnum(r.total_packages),
    issue_date: r.issue_date || '',
  })) as any;
}

export async function createTradeBillOfLading(bl: Partial<TradeBillOfLadingRecord> & Record<string, any>): Promise<any> {
  const order = await requireTradeOrder(bl.order_no || bl.shipment_no);
  if (!bl.carrier?.trim()) throw new Error('Enter the carrier');
  if (!(bl.vessel_name || bl.vessel)?.trim?.()) throw new Error('Enter the vessel');
  if (!bl.consignee?.trim()) throw new Error('Enter the consignee');
  const row = tok(
    await supabase.from('trade_bills_of_lading').insert({
      bl_number: bl.bl_number || nextNo('BL'),
      order_id: order.id,
      order_no: order.order_no,
      carrier: bl.carrier.trim(),
      vessel_name: String(bl.vessel_name || bl.vessel).trim(),
      voyage_no: bl.voyage_no || bl.voyage_number || '',
      port_of_loading: bl.port_of_loading || order.origin_port || '',
      port_of_discharge: bl.port_of_discharge || order.destination_port || '',
      shipper: bl.shipper || '',
      consignee: bl.consignee.trim(),
      notify_party: bl.notify_party || '',
      container_no: bl.container_no || '',
      cargo_description: bl.cargo_description || order.commodity,
      total_packages: Number(bl.total_packages) || 0,
      package_type: bl.package_type || '',
      gross_weight_kg: Number(bl.gross_weight_kg) || 0,
      freight_terms: bl.freight_terms || '',
      status: bl.status || 'Issued',
      notes: bl.notes || '',
    }).select().single(),
    'Could not save the Bill of Lading'
  );
  // The order tracks the carrier details it ships under.
  await supabase.from('trade_orders').update({
    carrier: (row as any).carrier, vessel_flight: (row as any).vessel_name, voyage_no: (row as any).voyage_no,
    tracking_number: (row as any).container_no || order.tracking_number || '', updated_at: new Date().toISOString(),
  }).eq('id', order.id);
  triggerSync('ferex_trade_bls_change');
  triggerSync('ferex_trade_orders_change');
  return row;
}

export async function updateTradeBillOfLadingStatus(id: string, status: string): Promise<any> {
  const row = tok(await supabase.from('trade_bills_of_lading').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(), 'Could not update the Bill of Lading');
  if (!row) throw new Error('This Bill of Lading no longer exists. Refresh the page.');
  triggerSync('ferex_trade_bls_change');
  return row;
}

export async function deleteTradeBillOfLading(id: string): Promise<boolean> {
  const { error } = await supabase.from('trade_bills_of_lading').delete().eq('id', id);
  if (error) tfail(error, 'Could not delete the Bill of Lading');
  triggerSync('ferex_trade_bls_change');
  return true;
}

// ── Packing lists ──

export async function getTradePackingLists(): Promise<TradePackingListRecord[]> {
  const rows = tok(await supabase.from('trade_packing_lists').select('*').order('created_at', { ascending: false })) as any[];
  return (rows || []).map(r => ({
    ...r,
    shipment_no: r.order_no,
    packing_list_no: r.pl_number,
    client_name: r.buyer_name,
    gross_weight_kg: tnum(r.gross_weight_kg),
    net_weight_kg: tnum(r.net_weight_kg),
    volume_cbm: tnum(r.volume_cbm),
    total_packages: tnum(r.total_packages),
    status: r.container_status,
  })) as any;
}

export async function createTradePackingList(pl: Partial<TradePackingListRecord> & Record<string, any>): Promise<any> {
  const order = await requireTradeOrder(pl.order_no || pl.shipment_no);
  const gross = Number(pl.gross_weight_kg) || 0;
  const net = Number(pl.net_weight_kg) || 0;
  if (!(Number(pl.total_packages) > 0)) throw new Error('Enter the number of packages');
  if (gross > 0 && net > gross) throw new Error('Net weight cannot be more than gross weight');
  const row = tok(
    await supabase.from('trade_packing_lists').insert({
      pl_number: pl.packing_list_no || pl.pl_number || nextNo('PL'),
      order_id: order.id,
      order_no: order.order_no,
      invoice_no: pl.invoice_no || '',
      buyer_name: pl.buyer_name || order.client_name,
      cargo_description: pl.cargo_description || order.commodity,
      package_type: pl.package_type || '',
      total_packages: Number(pl.total_packages),
      gross_weight_kg: gross,
      net_weight_kg: net,
      dimensions: pl.dimensions || '',
      volume_cbm: Number(pl.volume_cbm) || 0,
      marks_numbers: pl.marks_numbers || '',
      container_status: pl.container_status || '',
      notes: pl.notes || '',
    }).select().single(),
    'Could not save the packing list'
  );
  triggerSync('ferex_trade_pls_change');
  return row;
}

export async function deleteTradePackingList(id: string): Promise<boolean> {
  const { error } = await supabase.from('trade_packing_lists').delete().eq('id', id);
  if (error) tfail(error, 'Could not delete the packing list');
  triggerSync('ferex_trade_pls_change');
  return true;
}

// ── Certificates ──

export async function getTradeCertificates(): Promise<any[]> {
  const rows = tok(await supabase.from('trade_certificates').select('*').order('created_at', { ascending: false })) as any[];
  return (rows || []).map(r => ({ ...r, shipment_no: r.order_no, issue_date: r.issue_date || '', expiry_date: r.expiry_date || '' }));
}

export async function createTradeCertificate(cert: Record<string, any>): Promise<any> {
  const orderRef = cert.order_no || cert.shipment_no;
  const order = orderRef ? await requireTradeOrder(orderRef) : null; // a master certificate is not tied to one order
  if (!String(cert.cert_type || '').trim()) throw new Error('Choose the certificate type');
  if (!String(cert.authority || '').trim()) throw new Error('Enter the issuing authority');
  if (cert.issue_date && cert.expiry_date && new Date(cert.expiry_date) <= new Date(cert.issue_date)) throw new Error('Expiry date must be after the issue date');
  const row = tok(
    await supabase.from('trade_certificates').insert({
      certificate_no: cert.certificate_no || cert.doc_number || nextNo('CERT'),
      order_id: order?.id || null,
      order_no: order?.order_no || '',
      cert_type: cert.cert_type,
      title: cert.title || cert.cert_type,
      authority: cert.authority,
      country: cert.country || '',
      exporter: cert.exporter || '',
      importer: cert.importer || order?.client_name || '',
      issue_date: dateOrNull(cert.issue_date),
      expiry_date: dateOrNull(cert.expiry_date),
      status: ['Verified & Active', 'Under Inspection', 'Expired', 'Revoked'].includes(cert.status) ? cert.status : 'Verified & Active',
      notes: cert.notes || '',
    }).select().single(),
    'Could not save the certificate'
  );
  triggerSync('ferex_trade_certs_change');
  return row;
}

export async function updateTradeCertificateStatus(id: string, status: string): Promise<any> {
  const row = tok(await supabase.from('trade_certificates').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(), 'Could not update the certificate');
  if (!row) throw new Error('This certificate no longer exists. Refresh the page.');
  triggerSync('ferex_trade_certs_change');
  return row;
}

export async function deleteTradeCertificate(id: string): Promise<boolean> {
  const { error } = await supabase.from('trade_certificates').delete().eq('id', id);
  if (error) tfail(error, 'Could not delete the certificate');
  triggerSync('ferex_trade_certs_change');
  return true;
}
