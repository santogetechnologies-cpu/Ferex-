import { supabase } from '../supabase';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';

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

export async function getTradeOrders(staffEmail?: string): Promise<TradeOrder[]> {
  try {
    let query = supabase
      .from('trade_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (staffEmail) {
      query = query.or(`assigned_staff_email.ilike.%${staffEmail}%,assigned_staff_name.ilike.%${staffEmail}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade orders:', error);
      return [];
    }

    return (data || []).map((o: any) => ({
      ...o,
      total_amount: Number(o.total_amount || 0),
      advance_percentage: Number(o.advance_percentage || 30),
      advance_amount: Number(o.advance_amount || 0),
      advance_paid: Number(o.advance_paid || 0),
      balance_amount: Number(o.balance_amount || 0),
      balance_paid: Number(o.balance_paid || 0),
      stage_history: Array.isArray(o.stage_history) ? o.stage_history : []
    }));
  } catch (err) {
    console.error('[TradeAPI] Unexpected error in getTradeOrders:', err);
    return [];
  }
}

export const getTradeShipments = getTradeOrders;

export async function getTradeOrderById(idOrOrderNo: string): Promise<TradeOrder | null> {
  try {
    const { data, error } = await supabase
      .from('trade_orders')
      .select('*')
      .or(`id.eq.${idOrOrderNo},order_no.eq.${idOrOrderNo}`)
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      total_amount: Number(data.total_amount || 0),
      advance_percentage: Number(data.advance_percentage || 30),
      advance_amount: Number(data.advance_amount || 0),
      advance_paid: Number(data.advance_paid || 0),
      balance_amount: Number(data.balance_amount || 0),
      balance_paid: Number(data.balance_paid || 0),
      stage_history: Array.isArray(data.stage_history) ? data.stage_history : []
    };
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeOrderById:', err);
    return null;
  }
}

export async function createTradeOrder(order: Partial<TradeOrder>): Promise<TradeOrder | null> {
  try {
    const total = Number(order.total_amount) || 0;
    const advPct = Number(order.advance_percentage) || 30;
    const advAmt = Number(order.advance_amount) || Math.round((total * advPct) / 100);
    const balAmt = total - advAmt;
    const currentStage = order.stage || 'Inquiry';

    const orderNo = order.order_no || `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord = {
      order_no: orderNo,
      po_number: order.po_number || '',
      client_id: order.client_id || null,
      client_name: order.client_name || 'Global Trade Partner',
      client_email: order.client_email || 'client@trade.com',
      client_phone: order.client_phone || '',
      client_country: order.client_country || 'Poland',
      commodity: order.commodity || 'Agricultural / Industrial Commodity',
      quantity_units: order.quantity_units || '1,000 MT',
      incoterm: order.incoterm || 'CIF (Cost, Insurance and Freight)',
      currency: order.currency || 'USD',
      total_amount: total,
      advance_percentage: advPct,
      advance_amount: advAmt,
      advance_paid: Number(order.advance_paid) || 0,
      advance_status: (order.advance_status || (Number(order.advance_paid) >= advAmt && advAmt > 0 ? 'Paid' : 'Pending')),
      balance_amount: balAmt,
      balance_paid: Number(order.balance_paid) || 0,
      balance_status: (order.balance_status || (Number(order.balance_paid) >= balAmt && balAmt > 0 ? 'Paid' : 'Pending')),
      payment_terms_desc: order.payment_terms_desc || `${advPct}% Advance, ${100 - advPct}% Balance against B/L copy`,
      lc_reference: order.lc_reference || '',
      stage: currentStage,
      stage_history: order.stage_history || [
        {
          stage: currentStage,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          confirmed_by: order.assigned_staff_name || 'Trade Desk',
          notes: 'Order initiated in system',
          auto_email_triggered: true
        }
      ],
      assigned_staff_name: order.assigned_staff_name || 'Elena Rostova',
      assigned_staff_email: order.assigned_staff_email || 'elena.rostova@ferex.com',
      assigned_staff_id: order.assigned_staff_id || null,
      carrier: order.carrier || '',
      vessel_flight: order.vessel_flight || '',
      voyage_no: order.voyage_no || '',
      tracking_number: order.tracking_number || '',
      origin_port: order.origin_port || 'Port of Gdansk, Poland',
      destination_port: order.destination_port || 'Port of Nhava Sheva (JNPT), India',
      etd: order.etd || new Date().toISOString().split('T')[0],
      eta: order.eta || new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
      notes: order.notes || ''
    };

    const { data, error } = await supabase
      .from('trade_orders')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('[TradeAPI] Error creating trade order:', error);
      throw error;
    }

    // Auto-sync client into CRM directory if not exists
    if (newRecord.client_name && newRecord.client_name !== 'Global Trade Partner') {
      try {
        const { data: existingClient } = await supabase
          .from('trade_clients')
          .select('id')
          .ilike('company_name', newRecord.client_name)
          .maybeSingle();

        if (!existingClient) {
          await supabase.from('trade_clients').insert([{
            company_name: newRecord.client_name,
            contact_person: newRecord.client_name,
            email: newRecord.client_email,
            phone: newRecord.client_phone || '',
            country: newRecord.client_country,
            city: 'Trade Port Desk',
            category: 'Buyer / Importer',
            portal_active: true
          }]);
          triggerSync('ferex_trade_clients_change');
        }
      } catch (clientErr) {
        console.warn('[TradeAPI] Could not auto-sync client partner:', clientErr);
      }
    }

    // Trigger automated notification
    if (currentStage === 'Order Confirmed') {
      await triggerTradeAutomatedEmail({
        trigger_type: 'order_confirmed',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: data.client_email,
        custom_data: { commodity: data.commodity, total_amount: data.total_amount, currency: data.currency }
      });
    }

    triggerSync('ferex_trade_orders_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Exception in createTradeOrder:', err);
    return null;
  }
}

export async function advanceTradeOrderStage(
  orderId: string,
  newStage: TradeOrderStage,
  confirmedBy: string = 'Ferex Trade Admin',
  notes?: string
): Promise<TradeOrder | null> {
  try {
    const existing = await getTradeOrderById(orderId);
    if (!existing) return null;

    const newHistoryEntry: StageHistoryEntry = {
      stage: newStage,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      confirmed_by: confirmedBy,
      notes: notes || `Stage confirmed: ${newStage}`,
      auto_email_triggered: true
    };

    const updatedHistory = [...(existing.stage_history || []), newHistoryEntry];

    const { data, error } = await supabase
      .from('trade_orders')
      .update({
        stage: newStage,
        stage_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${orderId},order_no.eq.${orderId}`)
      .select()
      .single();

    if (error) {
      console.error('[TradeAPI] Error advancing order stage:', error);
      throw error;
    }

    // Trigger automated notifications on key stage advancements
    if (newStage === 'Order Confirmed') {
      await triggerTradeAutomatedEmail({
        trigger_type: 'order_confirmed',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: data.client_email
      });
    } else if (newStage === 'Shipped') {
      await triggerTradeAutomatedEmail({
        trigger_type: 'shipped',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: data.client_email,
        custom_data: {
          carrier: data.carrier,
          vessel: data.vessel_flight,
          tracking: data.tracking_number,
          eta: data.eta
        }
      });
    } else if (newStage === 'Customs Clearance') {
      await triggerTradeAutomatedEmail({
        trigger_type: 'customs_cleared',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: data.client_email
      });
    } else if (newStage === 'Delivered') {
      await triggerTradeAutomatedEmail({
        trigger_type: 'delivered',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: data.client_email
      });
    }

    triggerSync('ferex_trade_orders_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Exception in advanceTradeOrderStage:', err);
    return null;
  }
}

export async function reassignTradeOrder(orderId: string, staffName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_orders')
      .update({
        assigned_staff_name: staffName,
        assigned_staff_email: staffEmail || `${staffName.toLowerCase().replace(/\s+/g, '.')}@ferex.com`,
        assigned_staff_id: staffId || null,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${orderId},order_no.eq.${orderId}`);

    if (error) {
      // Try trade_shipments if trade_orders not matched
      await supabase
        .from('trade_shipments')
        .update({
          assigned_staff: staffName,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    triggerSync('ferex_trade_orders_change');
    triggerSync('ferex_trade_shipments_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error reassigning trade shipment/order:', err);
    throw err;
  }
}

export const reassignTradeShipment = reassignTradeOrder;

export async function updateTradeOrder(orderId: string, updates: Partial<TradeOrder>): Promise<TradeOrder | null> {
  try {
    const { data, error } = await supabase
      .from('trade_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .or(`id.eq.${orderId},order_no.eq.${orderId}`)
      .select()
      .single();

    if (error) {
      console.error('[TradeAPI] Error updating order:', error);
      throw error;
    }

    triggerSync('ferex_trade_orders_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Exception in updateTradeOrder:', err);
    return null;
  }
}

export async function deleteTradeOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_orders')
      .delete()
      .or(`id.eq.${orderId},order_no.eq.${orderId}`);

    if (error) {
      console.error('[TradeAPI] Error deleting trade order:', error);
      throw error;
    }

    triggerSync('ferex_trade_orders_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Exception in deleteTradeOrder:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DOCUMENTS VAULT (7 CORE DOSSIERS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeDocuments(orderNo?: string): Promise<TradeDocument[]> {
  try {
    let query = supabase
      .from('trade_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (orderNo) {
      query = query.eq('order_no', orderNo);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade documents:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeDocuments:', err);
    return [];
  }
}

export async function uploadTradeDocument(doc: Partial<TradeDocument>, autoSend?: boolean): Promise<TradeDocument | null> {
  try {
    const isSent = autoSend || doc.sent_to_client || false;
    const newDoc = {
      order_id: doc.order_id || null,
      order_no: doc.order_no || 'GENERAL-TRD',
      client_name: doc.client_name || 'Global Trade Partner',
      doc_type: doc.doc_type || 'Commercial Invoice',
      doc_number: doc.doc_number || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      file_name: doc.file_name || 'Document.pdf',
      file_url: doc.file_url || '',
      file_size: doc.file_size || '245 KB',
      status: doc.status || 'Pending',
      rejection_reason: doc.rejection_reason || '',
      notes: doc.notes || '',
      uploaded_by: doc.uploaded_by || 'Operations Desk',
      verified_by: doc.verified_by || '',
      verified_at: doc.verified_at || null,
      sent_to_client: isSent,
      sent_to_client_at: isSent ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('trade_documents')
      .insert([newDoc])
      .select()
      .single();

    if (error) throw error;

    if (isSent && data) {
      await triggerTradeAutomatedEmail({
        trigger_type: 'document_ready',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: `${data.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@trade.com`,
        custom_data: { doc_type: data.doc_type, doc_number: data.doc_number }
      });
    }

    triggerSync('ferex_trade_documents_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error uploading trade document:', err);
    return null;
  }
}

export async function verifyTradeDocument(
  docId: string,
  verifiedBy: string = 'Ferex Trade Admin',
  notes?: string
): Promise<TradeDocument | null> {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .update({
        status: 'Verified',
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        notes: notes || 'Verified and approved for customs & banking clearance',
        updated_at: new Date().toISOString()
      })
      .eq('id', docId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_documents_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error verifying trade document:', err);
    return null;
  }
}

export async function rejectTradeDocument(
  docId: string,
  reason: string,
  rejectedBy: string = 'Ferex Trade Admin'
): Promise<TradeDocument | null> {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .update({
        status: 'Rejected',
        rejection_reason: reason,
        verified_by: rejectedBy,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', docId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_documents_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error rejecting trade document:', err);
    return null;
  }
}

export async function updateTradeDocument(
  docId: string,
  updates: Partial<TradeDocument>
): Promise<TradeDocument | null> {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', docId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_documents_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error updating trade document:', err);
    return null;
  }
}

export async function updateTradeDocumentStatus(
  docId: string,
  status: TradeDocInternalStatus,
  verifiedBy: string = 'Ferex Trade Admin',
  rejectionReason?: string
): Promise<TradeDocument | null> {
  if (status === 'Verified') {
    return verifyTradeDocument(docId, verifiedBy);
  } else if (status === 'Rejected') {
    return rejectTradeDocument(docId, rejectionReason || 'Compliance document rejected', verifiedBy);
  } else {
    return updateTradeDocument(docId, { status });
  }
}

export async function sendTradeDocToClient(docId: string): Promise<TradeDocument | null> {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .update({
        sent_to_client: true,
        sent_to_client_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', docId)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await triggerTradeAutomatedEmail({
        trigger_type: 'document_ready',
        order_no: data.order_no,
        recipient_name: data.client_name,
        recipient_email: `${data.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@trade.com`,
        custom_data: { doc_type: data.doc_type, doc_number: data.doc_number }
      });
    }

    triggerSync('ferex_trade_documents_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error sending doc to client:', err);
    return null;
  }
}

export async function deleteTradeDocument(docId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_documents')
      .delete()
      .eq('id', docId);

    if (error) throw error;
    triggerSync('ferex_trade_documents_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error deleting trade document:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OPERATIONAL TASKS & LOGISTICS QUEUE
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeTasks(staffEmail?: string): Promise<TradeTask[]> {
  try {
    let query = supabase
      .from('trade_tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (staffEmail) {
      query = query.or(`assigned_staff_email.ilike.%${staffEmail}%,assigned_staff_name.ilike.%${staffEmail}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade tasks:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeTasks:', err);
    return [];
  }
}

export async function createTradeTask(task: Partial<TradeTask>): Promise<TradeTask | null> {
  try {
    const newTask = {
      title: task.title || 'Untitled Trade Task',
      category: task.category || 'Order Handling',
      order_no: task.order_no || '',
      client_name: task.client_name || '',
      assigned_staff_name: task.assigned_staff_name || 'Elena Rostova',
      assigned_staff_email: task.assigned_staff_email || 'elena.rostova@ferex.com',
      assigned_staff_id: task.assigned_staff_id || null,
      priority: task.priority || 'Medium',
      status: task.status || 'Pending',
      due_date: task.due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      notes: task.notes || ''
    };

    const { data, error } = await supabase
      .from('trade_tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_tasks_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error creating trade task:', err);
    return null;
  }
}

export async function updateTradeTask(taskId: string, updates: Partial<TradeTask>): Promise<TradeTask | null> {
  try {
    const { data, error } = await supabase
      .from('trade_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_tasks_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error updating trade task:', err);
    return null;
  }
}

export async function deleteTradeTask(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    triggerSync('ferex_trade_tasks_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error deleting trade task:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TICKETS & ISSUE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeTickets(staffEmail?: string): Promise<TradeTicket[]> {
  try {
    let query = supabase
      .from('trade_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (staffEmail) {
      query = query.or(`assigned_staff_email.ilike.%${staffEmail}%,assigned_staff_name.ilike.%${staffEmail}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade tickets:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeTickets:', err);
    return [];
  }
}

export async function createTradeTicket(ticket: Partial<TradeTicket>): Promise<TradeTicket | null> {
  try {
    const newTicket = {
      ticket_no: ticket.ticket_no || `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      client_name: ticket.client_name || 'Global Trade Partner',
      client_contact: ticket.client_contact || '',
      order_no: ticket.order_no || '',
      channel: ticket.channel || 'Email',
      subject: ticket.subject || 'Inquiry / Issue',
      description: ticket.description || '',
      priority: ticket.priority || 'Medium',
      status: ticket.status || 'Open',
      assigned_staff_name: ticket.assigned_staff_name || 'Elena Rostova',
      assigned_staff_email: ticket.assigned_staff_email || 'elena.rostova@ferex.com',
      assigned_staff_id: ticket.assigned_staff_id || null,
      resolution_notes: ticket.resolution_notes || '',
      logged_by: ticket.logged_by || 'Staff Desk'
    };

    const { data, error } = await supabase
      .from('trade_tickets')
      .insert([newTicket])
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_tickets_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error creating trade ticket:', err);
    return null;
  }
}

export async function updateTradeTicket(ticketId: string, updates: Partial<TradeTicket>): Promise<TradeTicket | null> {
  try {
    const { data, error } = await supabase
      .from('trade_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_tickets_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error updating trade ticket:', err);
    return null;
  }
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

export async function deleteTradeTicket(ticketId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_tickets')
      .delete()
      .eq('id', ticketId);

    if (error) throw error;
    triggerSync('ferex_trade_tickets_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error deleting trade ticket:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAYMENTS & FINANCIAL SETTLEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradePayments(orderNo?: string): Promise<TradePaymentRecord[]> {
  try {
    let query = supabase
      .from('trade_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (orderNo) {
      query = query.eq('order_no', orderNo);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade payments:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      amount: Number(p.amount || 0)
    }));
  } catch (err) {
    console.error('[TradeAPI] Error in getTradePayments:', err);
    return [];
  }
}

export async function createTradePayment(payment: Partial<TradePaymentRecord>): Promise<TradePaymentRecord | null> {
  try {
    const amt = Number(payment.amount) || 0;
    const orderNo = payment.order_no || 'TRD-2026-8801';

    const newPayment = {
      order_no: orderNo,
      order_id: payment.order_id || null,
      client_name: payment.client_name || 'Global Trade Partner',
      client_id: payment.client_id || null,
      type: payment.type || 'Advance Payment',
      amount: amt,
      currency: payment.currency || 'USD',
      payment_method: payment.payment_method || 'Bank Wire / SWIFT',
      transaction_ref: payment.transaction_ref || '',
      lc_reference: payment.lc_reference || '',
      receipt_no: payment.receipt_no || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      notes: payment.notes || ''
    };

    const { data, error } = await supabase
      .from('trade_payments')
      .insert([newPayment])
      .select()
      .single();

    if (error) throw error;

    // Update order financial status
    try {
      const order = await getTradeOrderById(orderNo);
      if (order) {
        let advPaid = order.advance_paid;
        let balPaid = order.balance_paid;

        if (newPayment.type.includes('Advance')) {
          advPaid += amt;
        } else {
          balPaid += amt;
        }

        const advStatus = advPaid >= order.advance_amount && order.advance_amount > 0 ? 'Paid' : order.advance_status;
        const balStatus = balPaid >= order.balance_amount && order.balance_amount > 0 ? 'Paid' : order.balance_status;

        await updateTradeOrder(order.id, {
          advance_paid: advPaid,
          advance_status: advStatus as any,
          balance_paid: balPaid,
          balance_status: balStatus as any
        });
      }
    } catch (ordErr) {
      console.warn('[TradeAPI] Could not update order financial totals:', ordErr);
    }

    // Trigger payment received notification
    await triggerTradeAutomatedEmail({
      trigger_type: 'payment_received',
      order_no: orderNo,
      recipient_name: data.client_name,
      recipient_email: `${data.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@trade.com`,
      custom_data: { amount: data.amount, currency: data.currency, receipt_no: data.receipt_no }
    });

    triggerSync('ferex_trade_payments_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error logging trade payment:', err);
    return null;
  }
}

export async function deleteTradePayment(paymentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
    triggerSync('ferex_trade_payments_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error deleting trade payment:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLIENT PARTNERS & CRM DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeClients(search?: string): Promise<TradeClientPartner[]> {
  try {
    let query = supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (search && search.trim()) {
      query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,country.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[TradeAPI] Error fetching trade clients:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      credit_limit: Number(c.credit_limit || 0)
    }));
  } catch (err) {
    console.error('[TradeAPI] Error in getTradeClients:', err);
    return [];
  }
}

export const getTradeCRMContacts = getTradeClients;

export async function createTradeClient(client: Partial<TradeClientPartner>): Promise<TradeClientPartner | null> {
  try {
    const newClient = {
      company_name: client.company_name || 'New Trade Partner',
      contact_person: client.contact_person || 'Procurement Officer',
      email: client.email || 'partner@trade.com',
      phone: client.phone || '',
      country: client.country || 'Poland',
      city: client.city || '',
      category: client.category || 'Buyer / Importer',
      vat_number: client.vat_number || '',
      payment_terms: client.payment_terms || '30% Advance Wire, 70% Balance against Shipping B/L copy',
      credit_limit: Number(client.credit_limit) || 500000.00,
      portal_active: client.portal_active !== false,
      temp_password: client.temp_password || 'Trade@2026',
      notes: client.notes || ''
    };

    const { data, error } = await supabase
      .from('trade_clients')
      .insert([newClient])
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_clients_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error creating trade client:', err);
    return null;
  }
}

export async function updateTradeClient(
  clientId: string,
  updates: Partial<TradeClientPartner>
): Promise<TradeClientPartner | null> {
  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_clients_change');
    return data;
  } catch (err) {
    console.error('[TradeAPI] Error updating trade client:', err);
    return null;
  }
}

export async function deleteTradeClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_clients')
      .delete()
      .eq('id', clientId);

    if (error) throw error;
    triggerSync('ferex_trade_clients_change');
    return true;
  } catch (err) {
    console.error('[TradeAPI] Error deleting trade client:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. NOTIFICATIONS & AUTOMATED EMAIL LOGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getTradeNotifications(): Promise<TradeAutomatedEmail[]> {
  try {
    const { data, error } = await supabase
      .from('trade_notifications')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('[TradeAPI] Error fetching trade notifications:', error);
      return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      trigger_type: n.trigger_type,
      trigger_label: n.trigger_label,
      order_no: n.order_no,
      recipient_name: n.recipient_name,
      recipient_email: n.recipient_email,
      subject: n.subject,
      content_preview: n.content_preview || '',
      sent_at: n.sent_at || n.created_at,
      status: n.status || 'Sent'
    }));
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

    const { data, error } = await supabase
      .from('trade_notifications')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw error;
    triggerSync('ferex_trade_emails_change');
    return data;
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

export async function getTradeLettersOfCredit(): Promise<TradeLetterOfCreditRecord[]> {
  try {
    const docs = await getTradeDocuments();
    const lcDocs = docs.filter(d => d.doc_type === 'Letter of Credit');
    return lcDocs.map(d => ({
      id: d.id,
      lc_number: d.doc_number || 'LC-BANK-001',
      order_no: d.order_no,
      applicant: d.client_name,
      beneficiary: 'FEREX Global Trade & Maritime Corp',
      issuing_bank: 'BNP Paribas Corporate Banking',
      advising_bank: 'Standard Chartered Bank',
      amount: 100000,
      currency: 'USD',
      expiry_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      status: d.status,
      file_url: d.file_url,
      notes: d.notes,
      created_at: d.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function createTradeLetterOfCredit(lc: Partial<TradeLetterOfCreditRecord>): Promise<any> {
  return uploadTradeDocument({
    order_no: lc.order_no || 'TRD-GENERAL',
    client_name: lc.applicant || 'Trade Partner',
    doc_type: 'Letter of Credit',
    doc_number: lc.lc_number || `LC-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: `LC_${lc.lc_number || 'Doc'}.pdf`,
    notes: lc.notes || `LC issued by ${lc.issuing_bank || 'Bank'}`,
    status: (lc.status as any) || 'Verified'
  });
}

export async function updateTradeLetterOfCreditStatus(id: string, status: string, notes?: string): Promise<any> {
  if (notes) {
    return updateTradeDocument(id, { status: status as any, notes });
  }
  return updateTradeDocumentStatus(id, status as any);
}

export async function deleteTradeLetterOfCredit(id: string): Promise<boolean> {
  return deleteTradeDocument(id);
}

export async function getTradeCertificates(): Promise<TradeDocument[]> {
  const docs = await getTradeDocuments();
  return docs.filter(d => d.doc_type === 'Certificate of Origin' || d.doc_type === 'Inspection Certificate' || d.doc_type.toLowerCase().includes('cert'));
}

export async function deleteTradeCertificate(id: string): Promise<boolean> {
  return deleteTradeDocument(id);
}

export async function getTradeInvoices(): Promise<TradeInvoiceRecord[]> {
  try {
    const [orders, docs] = await Promise.all([
      getTradeOrders(),
      getTradeDocuments()
    ]);

    const invoiceDocs = docs.filter(d => d.doc_type === 'Commercial Invoice' || d.doc_type === 'Proforma Invoice');
    
    return invoiceDocs.map(d => {
      const relatedOrder = orders.find(o => o.order_no === d.order_no);
      return {
        id: d.id,
        invoice_number: d.doc_number || `INV-${d.order_no}`,
        order_no: d.order_no,
        client_name: d.client_name,
        issue_date: d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        amount: relatedOrder ? relatedOrder.total_amount : 50000,
        currency: relatedOrder ? relatedOrder.currency : 'USD',
        incoterm: relatedOrder ? relatedOrder.incoterm : 'CIF (Cost, Insurance and Freight)',
        status: d.status === 'Verified' ? 'Paid' : 'Issued',
        paid_amount: relatedOrder ? (relatedOrder.advance_paid + relatedOrder.balance_paid) : 0,
        notes: d.notes,
        created_at: d.created_at
      };
    });
  } catch (err) {
    return [];
  }
}

export async function createTradeInvoice(invoice: Partial<TradeInvoiceRecord>): Promise<any> {
  return uploadTradeDocument({
    order_no: invoice.order_no || 'TRD-GENERAL',
    client_name: invoice.client_name || 'Trade Partner',
    doc_type: 'Commercial Invoice',
    doc_number: invoice.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: `Commercial_Invoice_${invoice.invoice_number || 'Doc'}.pdf`,
    notes: invoice.notes || '',
    status: 'Verified'
  });
}

export async function updateTradeInvoiceStatus(id: string, status: string): Promise<any> {
  return updateTradeDocumentStatus(id, status === 'Paid' ? 'Verified' : 'Submitted');
}

export async function deleteTradeInvoice(id: string): Promise<boolean> {
  return deleteTradeDocument(id);
}

export async function getTradePackingLists(): Promise<TradePackingListRecord[]> {
  try {
    const docs = await getTradeDocuments();
    const plDocs = docs.filter(d => d.doc_type === 'Packing List');
    return plDocs.map(d => ({
      id: d.id,
      packing_list_no: d.doc_number || `PL-${d.order_no}`,
      order_no: d.order_no,
      client_name: d.client_name,
      total_packages: 50,
      gross_weight_kg: 25000,
      net_weight_kg: 24500,
      volume_cbm: 65,
      status: d.status,
      file_url: d.file_url,
      created_at: d.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function createTradePackingList(pl: Partial<TradePackingListRecord>): Promise<any> {
  return uploadTradeDocument({
    order_no: pl.order_no || 'TRD-GENERAL',
    client_name: pl.client_name || 'Trade Partner',
    doc_type: 'Packing List',
    doc_number: pl.packing_list_no || `PL-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: `Packing_List_${pl.packing_list_no || 'Doc'}.pdf`,
    status: (pl.status as any) || 'Verified'
  });
}

export async function deleteTradePackingList(id: string): Promise<boolean> {
  return deleteTradeDocument(id);
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

export async function getTradeBillsOfLading(): Promise<TradeBillOfLadingRecord[]> {
  try {
    const docs = await getTradeDocuments();
    const blDocs = docs.filter(d => d.doc_type === 'Bill of Lading / Airway Bill' || d.doc_type.toLowerCase().includes('lading'));
    return blDocs.map(d => ({
      id: d.id,
      bl_number: d.doc_number || `BL-${d.order_no}`,
      order_no: d.order_no,
      carrier: 'Maersk Line',
      vessel_name: 'MAERSK MC-KINNEY MOLLER',
      voyage_number: 'VY-2026-08',
      port_of_loading: 'Port of Gdansk, Poland',
      port_of_discharge: 'Port of Nhava Sheva (JNPT), India',
      shipper: 'FEREX Global Trade & Maritime Corp',
      consignee: d.client_name,
      issue_date: d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      status: d.status === 'Verified' ? 'Issued' : 'Draft',
      file_url: d.file_url,
      notes: d.notes,
      created_at: d.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function createTradeBillOfLading(bl: Partial<TradeBillOfLadingRecord>): Promise<any> {
  return uploadTradeDocument({
    order_no: bl.order_no || bl.shipment_no || 'TRD-GENERAL',
    client_name: bl.consignee || 'Trade Partner',
    doc_type: 'Bill of Lading / Airway Bill',
    doc_number: bl.bl_number || `BL-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: `Bill_of_Lading_${bl.bl_number || 'Doc'}.pdf`,
    notes: bl.notes || `Carrier: ${bl.carrier || 'Ocean Line'}`,
    status: 'Verified'
  });
}

export async function updateTradeBillOfLadingStatus(id: string, status: string): Promise<any> {
  return updateTradeDocumentStatus(id, status === 'Issued' ? 'Verified' : 'Submitted');
}

export async function deleteTradeBillOfLading(id: string): Promise<boolean> {
  return deleteTradeDocument(id);
}

export async function createTradeCertificate(cert: Partial<TradeDocument> & Record<string, any>): Promise<any> {
  const rawStatus = String(cert.status || 'Submitted').toLowerCase();
  const normStatus = (rawStatus.includes('verif') || rawStatus.includes('issu') || rawStatus.includes('appr')) ? 'Verified' : 'Submitted';
  return uploadTradeDocument({
    order_no: cert.order_no || cert.shipment_no || 'TRD-GENERAL',
    client_name: cert.client_name || cert.importer || 'Trade Partner',
    doc_type: (cert.doc_type || (cert.cert_type ? String(cert.cert_type) : 'Certificate of Origin')) as any,
    doc_number: cert.doc_number || cert.certificate_no || `CERT-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: cert.file_name || `Certificate_${cert.doc_number || cert.certificate_no || 'Doc'}.pdf`,
    notes: cert.notes || `Authority: ${cert.authority || 'Chamber of Commerce'}`,
    status: normStatus as any
  });
}

export async function updateTradeCertificateStatus(id: string, status: string): Promise<any> {
  return updateTradeDocumentStatus(id, status as any);
}

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

export async function updateTradeTicketStatus(ticketId: string, status: TradeTicket['status'], resolutionNotes?: string): Promise<TradeTicket | null> {
  const updates: Partial<TradeTicket> = { status };
  if (resolutionNotes) updates.resolution_notes = resolutionNotes;
  return updateTradeTicket(ticketId, updates);
}

export async function reassignTradeTicket(ticketId: string, assignedTo: string, ..._rest: any[]): Promise<TradeTicket | null> {
  return updateTradeTicket(ticketId, { assigned_staff_name: assignedTo, assigned_to: assignedTo });
}

// In-Memory Realtime Message Cache for Client & Admin Portals
let _cachedTradeMessages: TradeChatMessage[] = [];

export async function getTradeMessages(conversationId?: string): Promise<TradeChatMessage[]> {
  if (_cachedTradeMessages.length === 0) {
    _cachedTradeMessages = [
      {
        id: 'msg-1',
        conversation_id: 'client_portal',
        contact_name: 'Baltic Grain Sp. z o.o.',
        sender_name: 'Elena Rostova (FEREX Operations Desk)',
        message: 'Welcome to FEREX Global Trade terminal. Ocean freight booking confirmed under CIF Gdansk.',
        is_self: false,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'msg-2',
        conversation_id: 'client_portal',
        contact_name: 'Baltic Grain Sp. z o.o.',
        sender_name: 'Baltic Grain Procurement Officer',
        message: 'Thank you Elena. Commercial Invoice & Phytosanitary Certificate downloaded for customs pre-declaration.',
        is_self: true,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];
  }
  if (conversationId) {
    return _cachedTradeMessages.filter(m => m.conversation_id === conversationId);
  }
  return _cachedTradeMessages;
}

export async function sendTradeMessage(msg: Partial<TradeChatMessage>): Promise<TradeChatMessage> {
  const newMsg: TradeChatMessage = {
    id: `msg-${Date.now()}`,
    conversation_id: msg.conversation_id || 'client_portal',
    contact_name: msg.contact_name || 'Trade Partner',
    sender_name: msg.sender_name || 'Operations Officer',
    message: msg.message || '',
    is_self: msg.is_self || false,
    created_at: new Date().toISOString()
  };
  _cachedTradeMessages.push(newMsg);
  triggerSync('ferex_trade_messages_change');
  return newMsg;
}
