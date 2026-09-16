import { supabase } from '../supabase';

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
  assigned_staff_name: string;
  assigned_staff_email: string;
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
  assigned_staff_name: string;
  assigned_staff_email: string;
  resolution_notes?: string;
  logged_by: string;
  created_at: string;
  updated_at: string;
}

export interface TradePaymentRecord {
  id: string;
  order_no: string;
  client_name: string;
  type: 'Advance Payment' | 'Balance Settlement' | 'Full Payment' | 'LC Drawdown';
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
  portal_active: boolean;
  temp_password?: string;
  created_at: string;
}

// ─── UUID HELPER ────────────────────────────────────────────────────────────
function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── DEFAULT SEED DATA ──────────────────────────────────────────────────────
const DEFAULT_STAFF_OFFICERS = [
  { name: 'Marcus Vance', email: 'marcus.vance@ferex.com', role: 'Trade Officer', department: 'Trade Operations' },
  { name: 'Elena Rostova', email: 'elena.rostova@ferex.com', role: 'Logistics Officer', department: 'Logistics Desk' },
  { name: 'Krzysztof Nowak', email: 'krzysztof.nowak@ferex.com', role: 'Documentation Specialist', department: 'Customs Compliance' },
  { name: 'Rahul Sharma', email: 'trade@ferex.com', role: 'Trade Director', department: 'Executive Desk' },
];

export interface TradeStaffOfficer {
  name: string;
  email: string;
  role: string;
  department?: string;
}

export function getTradeStaffOfficers(): TradeStaffOfficer[] {
  const staffList: TradeStaffOfficer[] = [...DEFAULT_STAFF_OFFICERS];

  if (typeof localStorage !== 'undefined') {
    try {
      // 1. Custom Trade Staff
      const customTrade = localStorage.getItem('ferex_trade_staff_v2');
      if (customTrade) {
        const parsed = JSON.parse(customTrade);
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            const email = (s.email || '').toLowerCase().trim();
            if (email && !staffList.some(existing => existing.email.toLowerCase() === email)) {
              staffList.push({
                name: s.name || s.full_name || email.split('@')[0],
                email,
                role: s.role || 'Trade Officer',
                department: s.department || 'Trade Operations'
              });
            }
          }
        }
      }

      // 2. Global Ferex Staff / Admin Users
      const globalStaff = localStorage.getItem('ferex_staff_users');
      if (globalStaff) {
        const parsed = JSON.parse(globalStaff);
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            const email = (s.email || '').toLowerCase().trim();
            if (email && !staffList.some(existing => existing.email.toLowerCase() === email)) {
              staffList.push({
                name: s.full_name || s.name || email.split('@')[0],
                email,
                role: s.role || 'Logistics Officer',
                department: s.department || 'Operations Desk'
              });
            }
          }
        }
      }

      // 3. Current logged in user (if trade or staff)
      const curUser = localStorage.getItem('ferex_user');
      if (curUser) {
        const parsed = JSON.parse(curUser);
        const email = (parsed.email || '').toLowerCase().trim();
        const name = parsed.full_name || parsed.name;
        if (email && name && !staffList.some(existing => existing.email.toLowerCase() === email)) {
          staffList.push({
            name,
            email,
            role: parsed.role === 'trade_admin' ? 'Trade Director' : 'Logistics Officer',
            department: 'Trade Desk'
          });
        }
      }
    } catch {}
  }

  return staffList;
}

export const getTradeStaff = getTradeStaffOfficers;


function initTradeDataIfEmpty() {
  if (typeof localStorage === 'undefined') return;

  if (!localStorage.getItem('ferex_trade_orders_v2')) {
    const initialOrders: TradeOrder[] = [
      {
        id: 'ord-101',
        order_no: 'TRD-2026-8801',
        po_number: 'PO-BALTIC-771',
        client_name: 'Baltic Grain Sp. z o.o.',
        client_email: 'trade@balticgrain.pl',
        client_phone: '+48 58 660 4100',
        client_country: 'Poland',
        commodity: 'Milling Wheat Grade A (Non-GMO, 14.5% Protein)',
        quantity_units: '5,000 Metric Tons',
        incoterm: 'CIF (Cost, Insurance and Freight)',
        currency: 'USD',
        total_amount: 1450000,
        advance_percentage: 30,
        advance_amount: 435000,
        advance_paid: 435000,
        advance_status: 'Paid',
        balance_amount: 1015000,
        balance_paid: 0,
        balance_status: 'Pending',
        payment_terms_desc: '30% Advance Wire, 70% Balance against Shipping B/L copy',
        lc_reference: 'LC-BNP-PARIS-9021',
        stage: 'Shipped',
        stage_history: [
          { stage: 'Inquiry', timestamp: '2026-08-10 09:30', confirmed_by: 'Marcus Vance', auto_email_triggered: true },
          { stage: 'Quote Sent', timestamp: '2026-08-12 14:00', confirmed_by: 'Marcus Vance', auto_email_triggered: true },
          { stage: 'Order Confirmed', timestamp: '2026-08-15 11:20', confirmed_by: 'Ferex Trade Admin', auto_email_triggered: true },
          { stage: 'Production/Sourcing', timestamp: '2026-08-20 08:45', confirmed_by: 'Elena Rostova', auto_email_triggered: true },
          { stage: 'Shipped', timestamp: '2026-09-02 16:30', confirmed_by: 'Elena Rostova', notes: 'Loaded on MSC Gülsün with ocean tracking', auto_email_triggered: true },
        ],
        assigned_staff_name: 'Elena Rostova',
        assigned_staff_email: 'elena.rostova@ferex.com',
        carrier: 'MSC (Mediterranean Shipping Company)',
        vessel_flight: 'MSC Gülsün',
        voyage_no: 'VY-2026-088',
        tracking_number: 'MSCU9839438PL',
        origin_port: 'Port of Gdansk, Poland',
        destination_port: 'Port of Nhava Sheva (JNPT), India',
        etd: '2026-09-02',
        eta: '2026-09-26',
        notes: 'Bulk grain consignment in moisture-proof high cube containers.',
        created_at: '2026-08-10T09:30:00.000Z',
        updated_at: '2026-09-02T16:30:00.000Z',
      },
      {
        id: 'ord-102',
        order_no: 'TRD-2026-8802',
        po_number: 'PO-HAMBURG-390',
        client_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        client_email: 'procurement@hamburg-steel.de',
        client_phone: '+49 40 3344 5500',
        client_country: 'Germany',
        commodity: 'Cold Rolled Steel Coils DC01 (EN 10130)',
        quantity_units: '850 Metric Tons',
        incoterm: 'CFR (Cost and Freight)',
        currency: 'EUR',
        total_amount: 820000,
        advance_percentage: 20,
        advance_amount: 164000,
        advance_paid: 164000,
        advance_status: 'Paid',
        balance_amount: 656000,
        balance_paid: 0,
        balance_status: 'Pending',
        payment_terms_desc: '20% Deposit, 80% Irrevocable Confirmed LC at 60 Days Sight',
        lc_reference: 'LC-DB-HAMBURG-4412',
        stage: 'Production/Sourcing',
        stage_history: [
          { stage: 'Inquiry', timestamp: '2026-08-25 10:00', confirmed_by: 'Marcus Vance', auto_email_triggered: true },
          { stage: 'Quote Sent', timestamp: '2026-08-27 16:15', confirmed_by: 'Marcus Vance', auto_email_triggered: true },
          { stage: 'Order Confirmed', timestamp: '2026-09-01 09:00', confirmed_by: 'Ferex Trade Admin', auto_email_triggered: true },
          { stage: 'Production/Sourcing', timestamp: '2026-09-05 11:30', confirmed_by: 'Marcus Vance', notes: 'Rolling mill production batch #DE-441 in progress', auto_email_triggered: true },
        ],
        assigned_staff_name: 'Marcus Vance',
        assigned_staff_email: 'marcus.vance@ferex.com',
        carrier: 'Maersk Line',
        vessel_flight: 'Maersk Mc-Kinney Moller',
        voyage_no: 'MK-2026-114',
        tracking_number: 'MAEU7719201DE',
        origin_port: 'Port of Hamburg, Germany',
        destination_port: 'Port of Chennai, India',
        etd: '2026-09-20',
        eta: '2026-10-12',
        notes: 'Coil packaging with heavy anti-corrosion VCI wrapping.',
        created_at: '2026-08-25T10:00:00.000Z',
        updated_at: '2026-09-05T11:30:00.000Z',
      },
      {
        id: 'ord-103',
        order_no: 'TRD-2026-8803',
        po_number: 'PO-DUBAI-882',
        client_name: 'Dubai Gold & Maritime Trading LLC',
        client_email: 'operations@dubaimaritime.ae',
        client_phone: '+971 4 883 9920',
        client_country: 'United Arab Emirates',
        commodity: 'Specialty Industrial Grade Brass Ingots',
        quantity_units: '320 Metric Tons',
        incoterm: 'FOB (Free On Board)',
        currency: 'USD',
        total_amount: 540000,
        advance_percentage: 50,
        advance_amount: 270000,
        advance_paid: 270000,
        advance_status: 'Paid',
        balance_amount: 270000,
        balance_paid: 270000,
        balance_status: 'Paid',
        payment_terms_desc: '50% Advance, 50% Balance Paid before Vessel Departure',
        lc_reference: 'LC-EMIRATES-NBD-0091',
        stage: 'Delivered',
        stage_history: [
          { stage: 'Inquiry', timestamp: '2026-07-20 10:00', confirmed_by: 'Krzysztof Nowak', auto_email_triggered: true },
          { stage: 'Quote Sent', timestamp: '2026-07-22 12:00', confirmed_by: 'Krzysztof Nowak', auto_email_triggered: true },
          { stage: 'Order Confirmed', timestamp: '2026-07-25 15:00', confirmed_by: 'Ferex Trade Admin', auto_email_triggered: true },
          { stage: 'Production/Sourcing', timestamp: '2026-07-29 09:00', confirmed_by: 'Elena Rostova', auto_email_triggered: true },
          { stage: 'Shipped', timestamp: '2026-08-05 14:00', confirmed_by: 'Elena Rostova', auto_email_triggered: true },
          { stage: 'Customs Clearance', timestamp: '2026-08-18 11:00', confirmed_by: 'Elena Rostova', auto_email_triggered: true },
          { stage: 'Delivered', timestamp: '2026-08-22 17:00', confirmed_by: 'Elena Rostova', notes: 'Consignee warehouse signed and accepted', auto_email_triggered: true },
        ],
        assigned_staff_name: 'Elena Rostova',
        assigned_staff_email: 'elena.rostova@ferex.com',
        carrier: 'CMA CGM',
        vessel_flight: 'CMA CGM Antoine de Saint Exupery',
        voyage_no: 'CMA-2026-90',
        tracking_number: 'CMAU1109920AE',
        origin_port: 'Port of Jebel Ali, Dubai',
        destination_port: 'Port of Nhava Sheva (JNPT), India',
        etd: '2026-08-05',
        eta: '2026-08-18',
        notes: 'Full payment completed. Final dossier archived.',
        created_at: '2026-07-20T10:00:00.000Z',
        updated_at: '2026-08-22T17:00:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(initialOrders));
  }

  if (!localStorage.getItem('ferex_trade_documents_v2')) {
    const initialDocs: TradeDocument[] = [
      {
        id: 'doc-001',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        doc_type: 'Proforma Invoice',
        doc_number: 'PI-2026-8801',
        file_name: 'Proforma_Invoice_TRD-2026-8801.pdf',
        file_size: '245 KB',
        status: 'Verified',
        notes: 'Officially signed by Trade Director and stamped.',
        uploaded_by: 'Marcus Vance',
        verified_by: 'Ferex Trade Admin',
        verified_at: '2026-08-12 15:00',
        sent_to_client: true,
        sent_to_client_at: '2026-08-12 15:05',
        created_at: '2026-08-12T14:30:00.000Z',
        updated_at: '2026-08-12T15:05:00.000Z',
      },
      {
        id: 'doc-002',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        doc_type: 'Commercial Invoice',
        doc_number: 'CI-2026-8801',
        file_name: 'Commercial_Invoice_CI-8801_Final.pdf',
        file_size: '310 KB',
        status: 'Verified',
        notes: 'Includes full CIF Nhava Sheva breakdown.',
        uploaded_by: 'Marcus Vance',
        verified_by: 'Ferex Trade Admin',
        verified_at: '2026-09-01 10:00',
        sent_to_client: true,
        sent_to_client_at: '2026-09-01 10:05',
        created_at: '2026-09-01T09:45:00.000Z',
        updated_at: '2026-09-01T10:05:00.000Z',
      },
      {
        id: 'doc-003',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        doc_type: 'Packing List',
        doc_number: 'PL-2026-8801',
        file_name: 'Packing_List_Manifest_TRD-8801.pdf',
        file_size: '180 KB',
        status: 'Verified',
        notes: '48 High-cube sea containers weight certified.',
        uploaded_by: 'Elena Rostova',
        verified_by: 'Elena Rostova',
        verified_at: '2026-09-02 11:00',
        sent_to_client: true,
        sent_to_client_at: '2026-09-02 11:10',
        created_at: '2026-09-02T10:30:00.000Z',
        updated_at: '2026-09-02T11:10:00.000Z',
      },
      {
        id: 'doc-004',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        doc_type: 'Bill of Lading / Airway Bill',
        doc_number: 'BL-MSC-9839438',
        file_name: 'Ocean_Bill_of_Lading_MSC_Clean_Onboard.pdf',
        file_size: '420 KB',
        status: 'Verified',
        notes: 'Clean On-Board Ocean Bill of Lading with 3 originals.',
        uploaded_by: 'Elena Rostova',
        verified_by: 'Ferex Trade Admin',
        verified_at: '2026-09-02 16:30',
        sent_to_client: true,
        sent_to_client_at: '2026-09-02 16:35',
        created_at: '2026-09-02T16:00:00.000Z',
        updated_at: '2026-09-02T16:35:00.000Z',
      },
      {
        id: 'doc-005',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        doc_type: 'Certificate of Origin',
        doc_number: 'COO-PL-2026-441',
        file_name: 'Certificate_of_Origin_Polish_Chamber.pdf',
        file_size: '290 KB',
        status: 'Verified',
        notes: 'Attested by Polish National Chamber of Commerce.',
        uploaded_by: 'Krzysztof Nowak',
        verified_by: 'Ferex Trade Admin',
        verified_at: '2026-09-03 14:00',
        sent_to_client: true,
        sent_to_client_at: '2026-09-03 14:15',
        created_at: '2026-09-03T13:30:00.000Z',
        updated_at: '2026-09-03T14:15:00.000Z',
      },
      {
        id: 'doc-006',
        order_no: 'TRD-2026-8801',
        doc_type: 'Inspection Certificate',
        doc_number: 'SGS-PL-90214-G',
        client_name: 'Baltic Grain Sp. z o.o.',
        file_name: 'SGS_Quality_Moisture_Inspection_Report.pdf',
        file_size: '512 KB',
        status: 'Submitted',
        notes: 'SGS moisture level 12.8% verified, pending final seal review.',
        uploaded_by: 'Elena Rostova',
        sent_to_client: false,
        created_at: '2026-09-04T09:00:00.000Z',
        updated_at: '2026-09-04T09:00:00.000Z',
      },
      {
        id: 'doc-007',
        order_no: 'TRD-2026-8802',
        client_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        doc_type: 'Letter of Credit',
        doc_number: 'LC-DB-HAMBURG-4412',
        file_name: 'Irrevocable_LC_MT700_DeutscheBank.pdf',
        file_size: '340 KB',
        status: 'Verified',
        notes: 'MT700 SWIFT verified with BNP Paribas desk.',
        uploaded_by: 'Marcus Vance',
        verified_by: 'Ferex Trade Admin',
        verified_at: '2026-09-02 11:30',
        sent_to_client: true,
        sent_to_client_at: '2026-09-02 11:35',
        created_at: '2026-09-02T11:00:00.000Z',
        updated_at: '2026-09-02T11:35:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_documents_v2', JSON.stringify(initialDocs));
  }

  if (!localStorage.getItem('ferex_trade_tasks_v2')) {
    const initialTasks: TradeTask[] = [
      {
        id: 'tsk-001',
        title: 'Review SGS Phytosanitary lab test for Grain Lot #PL-8801',
        category: 'Customs & Port',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        assigned_staff_name: 'Elena Rostova',
        assigned_staff_email: 'elena.rostova@ferex.com',
        priority: 'High',
        status: 'In Progress',
        due_date: '2026-09-18',
        notes: 'Ensure radioactivity and heavy metals analysis is attached before customs filing.',
        created_at: '2026-09-10T08:00:00.000Z',
        updated_at: '2026-09-10T08:00:00.000Z',
      },
      {
        id: 'tsk-002',
        title: 'Upload Final Mill Test Certificate (MTC EN 10204 3.1) for Steel Coils',
        category: 'Documentation',
        order_no: 'TRD-2026-8802',
        client_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        assigned_staff_name: 'Marcus Vance',
        assigned_staff_email: 'marcus.vance@ferex.com',
        priority: 'Medium',
        status: 'Pending',
        due_date: '2026-09-19',
        notes: 'Coordinate with Salzgitter Flachstahl rolling mill dispatcher.',
        created_at: '2026-09-12T10:30:00.000Z',
        updated_at: '2026-09-12T10:30:00.000Z',
      },
      {
        id: 'tsk-003',
        title: 'Prepare Port Dispatch & Container Gate Pass for Nhava Sheva Berth 4',
        category: 'Logistics',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        assigned_staff_name: 'Elena Rostova',
        assigned_staff_email: 'elena.rostova@ferex.com',
        priority: 'Urgent',
        status: 'Pending',
        due_date: '2026-09-22',
        notes: 'Vessel MSC Gülsün scheduled to dock Sep 26.',
        created_at: '2026-09-14T09:15:00.000Z',
        updated_at: '2026-09-14T09:15:00.000Z',
      },
      {
        id: 'tsk-004',
        title: 'Follow up on 70% Balance Wire Settlement with Baltic Finance Desk',
        category: 'Finance',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        assigned_staff_name: 'Marcus Vance',
        assigned_staff_email: 'marcus.vance@ferex.com',
        priority: 'High',
        status: 'In Progress',
        due_date: '2026-09-24',
        notes: 'Balance due: $1,015,000 USD against arrival notice.',
        created_at: '2026-09-15T11:00:00.000Z',
        updated_at: '2026-09-15T11:00:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(initialTasks));
  }

  if (!localStorage.getItem('ferex_trade_tickets_v2')) {
    const initialTickets: TradeTicket[] = [
      {
        id: 'tkt-001',
        ticket_no: 'TCK-2026-091',
        client_name: 'Baltic Grain Sp. z o.o.',
        client_contact: 'Marek Wojcik (+48 58 660 4100)',
        order_no: 'TRD-2026-8801',
        channel: 'Phone Call',
        subject: 'Request for updated container seal numbers before customs pre-lodgement',
        description: 'Client called requesting the exact high-security bolt seal numbers for containers 25-48 to pre-submit to Indian Customs ICEGATE.',
        priority: 'High',
        status: 'Resolved',
        assigned_staff_name: 'Elena Rostova',
        assigned_staff_email: 'elena.rostova@ferex.com',
        resolution_notes: 'Exported verified container packing manifest with all 48 seal numbers and emailed to client customs broker.',
        logged_by: 'Marcus Vance',
        created_at: '2026-09-04T10:20:00.000Z',
        updated_at: '2026-09-04T12:00:00.000Z',
      },
      {
        id: 'tkt-002',
        ticket_no: 'TCK-2026-092',
        client_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        client_contact: 'Dr. Klaus Richter (procurement@hamburg-steel.de)',
        order_no: 'TRD-2026-8802',
        channel: 'Email',
        subject: 'Clarification on LC expiry date extension request',
        description: 'Received email asking whether 15-day presentation period under MT700 field 48 is acceptable.',
        priority: 'Medium',
        status: 'In Progress',
        assigned_staff_name: 'Marcus Vance',
        assigned_staff_email: 'marcus.vance@ferex.com',
        resolution_notes: 'Communicating with trade finance banking desk for confirmation.',
        logged_by: 'Marcus Vance',
        created_at: '2026-09-06T14:45:00.000Z',
        updated_at: '2026-09-06T15:30:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(initialTickets));
  }

  if (!localStorage.getItem('ferex_trade_payments_v2')) {
    const initialPayments: TradePaymentRecord[] = [
      {
        id: 'pay-001',
        order_no: 'TRD-2026-8801',
        client_name: 'Baltic Grain Sp. z o.o.',
        type: 'Advance Payment',
        amount: 435000,
        currency: 'USD',
        payment_method: 'SWIFT Wire Transfer (MT103)',
        transaction_ref: 'SWIFT-PL-WAW-8891024',
        receipt_no: 'RCP-TRD-8801-ADV',
        payment_date: '2026-08-16',
        notes: '30% Advance deposit credited into FEREX Escrow Treasury Account.',
        created_at: '2026-08-16T12:00:00.000Z',
      },
      {
        id: 'pay-002',
        order_no: 'TRD-2026-8802',
        client_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        type: 'Advance Payment',
        amount: 164000,
        currency: 'EUR',
        payment_method: 'SEPA Corporate Wire',
        transaction_ref: 'SEPA-DE-HAM-339101',
        receipt_no: 'RCP-TRD-8802-ADV',
        payment_date: '2026-09-02',
        notes: '20% Advance deposit verified.',
        created_at: '2026-09-02T14:20:00.000Z',
      },
      {
        id: 'pay-003',
        order_no: 'TRD-2026-8803',
        client_name: 'Dubai Gold & Maritime Trading LLC',
        type: 'Full Payment',
        amount: 540000,
        currency: 'USD',
        payment_method: 'Direct Bank Settlement (Emirates NBD)',
        transaction_ref: 'ENBD-DXB-99104',
        receipt_no: 'RCP-TRD-8803-FULL',
        payment_date: '2026-08-15',
        notes: '100% full order settlement completed.',
        created_at: '2026-08-15T16:00:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_payments_v2', JSON.stringify(initialPayments));
  }

  if (!localStorage.getItem('ferex_trade_emails_v2')) {
    const initialEmails: TradeAutomatedEmail[] = [
      {
        id: 'em-001',
        trigger_type: 'order_confirmed',
        trigger_label: 'Order Confirmed',
        order_no: 'TRD-2026-8801',
        recipient_name: 'Baltic Grain Sp. z o.o.',
        recipient_email: 'trade@balticgrain.pl',
        subject: 'Official Confirmation: Global Trade Order TRD-2026-8801 Confirmed',
        content_preview: 'Dear Partner, your order for 5,000 MT Milling Wheat Grade A has been formally confirmed. Production and vessel booking initiated.',
        sent_at: '2026-08-15 11:20',
        status: 'Delivered',
      },
      {
        id: 'em-002',
        trigger_type: 'payment_received',
        trigger_label: 'Payment Received (Receipt)',
        order_no: 'TRD-2026-8801',
        recipient_name: 'Baltic Grain Sp. z o.o.',
        recipient_email: 'trade@balticgrain.pl',
        subject: 'Payment Acknowledged: Receipt RCP-TRD-8801-ADV ($435,000 USD)',
        content_preview: 'We confirm receipt of your 30% advance payment ($435,000 USD). Your official payment receipt is ready for download in your Client Portal.',
        sent_at: '2026-08-16 12:05',
        status: 'Delivered',
      },
      {
        id: 'em-003',
        trigger_type: 'shipped',
        trigger_label: 'Shipped (Tracking Info)',
        order_no: 'TRD-2026-8801',
        recipient_name: 'Baltic Grain Sp. z o.o.',
        recipient_email: 'trade@balticgrain.pl',
        subject: 'Cargo Dispatch Notification: Shipment Shipped on MSC Gülsün (MSCU9839438PL)',
        content_preview: 'Your consignment has been loaded onboard MSC Gülsün (Voyage VY-2026-088). POL: Port of Gdansk → POD: Nhava Sheva (ETA: Sep 26). Tracking is live in your Client Portal.',
        sent_at: '2026-09-02 16:35',
        status: 'Delivered',
      }
    ];
    localStorage.setItem('ferex_trade_emails_v2', JSON.stringify(initialEmails));
  }
}

// Auto-run initializer
initTradeDataIfEmpty();

// ─── 1. ORDERS ENGINE ───────────────────────────────────────────────────────

export async function getTradeOrders(): Promise<TradeOrder[]> {
  initTradeDataIfEmpty();
  let localOrders: TradeOrder[] = [];
  const local = localStorage.getItem('ferex_trade_orders_v2');
  if (local) {
    try { localOrders = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const lo of localOrders) {
        if (!merged.some(m => m.id === lo.id || m.order_no === lo.order_no)) {
          merged.push(lo);
        }
      }
      try { localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localOrders;
  } catch {
    return localOrders;
  }
}

export async function createTradeOrder(order: Partial<TradeOrder>): Promise<TradeOrder> {
  const newId = uid();
  const orderNo = order.order_no || `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalAmt = Number(order.total_amount) || 0;
  const advPct = Number(order.advance_percentage) || 30;
  const advAmt = Math.round((totalAmt * advPct) / 100);
  const balAmt = totalAmt - advAmt;

  const currentStage: TradeOrderStage = order.stage || 'Inquiry';

  const newOrder: TradeOrder = {
    id: newId,
    order_no: orderNo,
    po_number: order.po_number || `PO-${Math.floor(100 + Math.random() * 900)}`,
    client_id: order.client_id || '',
    client_name: order.client_name || 'Global Trade Client',
    client_email: (order.client_email || '').trim().toLowerCase(),
    client_phone: order.client_phone || '',
    client_country: order.client_country || 'International',
    commodity: order.commodity || 'Agricultural / Industrial Commodity',
    quantity_units: order.quantity_units || '1,000 MT',
    incoterm: order.incoterm || 'CIF (Cost, Insurance and Freight)',
    currency: order.currency || 'USD',
    total_amount: totalAmt,
    advance_percentage: advPct,
    advance_amount: advAmt,
    advance_paid: 0,
    advance_status: 'Pending',
    balance_amount: balAmt,
    balance_paid: 0,
    balance_status: 'Pending',
    payment_terms_desc: order.payment_terms_desc || `${advPct}% Advance, ${100 - advPct}% Balance before shipment`,
    lc_reference: order.lc_reference || '',
    stage: currentStage,
    stage_history: [
      {
        stage: currentStage,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        confirmed_by: order.assigned_staff_name || 'Trade Desk',
        auto_email_triggered: true
      }
    ],
    assigned_staff_name: order.assigned_staff_name || 'Elena Rostova',
    assigned_staff_email: order.assigned_staff_email || 'elena.rostova@ferex.com',
    carrier: order.carrier || '',
    vessel_flight: order.vessel_flight || '',
    voyage_no: order.voyage_no || '',
    tracking_number: order.tracking_number || '',
    origin_port: order.origin_port || 'Port of Gdansk, Poland',
    destination_port: order.destination_port || 'Port of Nhava Sheva (JNPT), India',
    etd: order.etd || new Date().toISOString().split('T')[0],
    eta: order.eta || new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
    notes: order.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getTradeOrders();
  const updated = [newOrder, ...current.filter(o => o.id !== newOrder.id && o.order_no !== newOrder.order_no)];
  try { localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_orders').insert(newOrder); } catch {}

  // Auto-sync client partner into CRM database if not already present
  if (newOrder.client_name && newOrder.client_name !== 'Global Trade Client') {
    try {
      const clients = await getTradeClients();
      if (!clients.some(c => c.company_name.toLowerCase() === newOrder.client_name.toLowerCase())) {
        const newPartner: TradeClientPartner = {
          id: uid(),
          company_name: newOrder.client_name,
          contact_person: newOrder.client_name,
          email: newOrder.client_email || `${newOrder.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@trade.com`,
          phone: newOrder.client_phone || '+48 58 000 0000',
          country: newOrder.client_country || 'Poland',
          city: 'Trade Port Desk',
          category: 'Buyer / Importer',
          portal_active: true,
          created_at: new Date().toISOString()
        };
        const updatedClients = [newPartner, ...clients];
        localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(updatedClients));
        try { await supabase.from('trade_clients').upsert(newPartner, { onConflict: 'id' }); } catch {}
        window.dispatchEvent(new Event('ferex_trade_clients_change'));
        window.dispatchEvent(new Event('ferex_trade_crm_change'));
      }
    } catch {}
  }

  // Trigger automated email if confirmed
  if (currentStage === 'Order Confirmed') {
    await triggerTradeAutomatedEmail({
      trigger_type: 'order_confirmed',
      order_no: newOrder.order_no,
      recipient_name: newOrder.client_name,
      recipient_email: newOrder.client_email,
      custom_data: { commodity: newOrder.commodity, total_amount: newOrder.total_amount, currency: newOrder.currency }
    });
  }

  window.dispatchEvent(new Event('ferex_trade_orders_change'));
  return newOrder;
}

export async function advanceTradeOrderStage(
  orderId: string,
  newStage: TradeOrderStage,
  confirmedBy: string = 'Ferex Trade Admin',
  notes?: string
): Promise<TradeOrder | null> {
  const current = await getTradeOrders();
  let updatedOrder: TradeOrder | null = null;

  const updated = current.map(order => {
    if (order.id === orderId || order.order_no === orderId) {
      const newHistory: StageHistoryEntry = {
        stage: newStage,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        confirmed_by: confirmedBy,
        notes: notes || `Stage confirmed: ${newStage}`,
        auto_email_triggered: true
      };

      updatedOrder = {
        ...order,
        stage: newStage,
        stage_history: [...(order.stage_history || []), newHistory],
        updated_at: new Date().toISOString(),
      };
      return updatedOrder;
    }
    return order;
  });

  if (!updatedOrder) return null;
  const safeOrder: TradeOrder = updatedOrder;

  try { localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_orders')
      .update({
        stage: newStage,
        stage_history: (safeOrder as any).stage_history,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${orderId},order_no.eq.${orderId}`);
  } catch {}

  // 1-Click Automated Email Triggers based on confirmed stage:
  if (newStage === 'Order Confirmed') {
    await triggerTradeAutomatedEmail({
      trigger_type: 'order_confirmed',
      order_no: safeOrder.order_no,
      recipient_name: safeOrder.client_name,
      recipient_email: safeOrder.client_email,
    });
  } else if (newStage === 'Shipped') {
    await triggerTradeAutomatedEmail({
      trigger_type: 'shipped',
      order_no: safeOrder.order_no,
      recipient_name: safeOrder.client_name,
      recipient_email: safeOrder.client_email,
      custom_data: {
        carrier: safeOrder.carrier,
        vessel: safeOrder.vessel_flight,
        tracking: safeOrder.tracking_number,
        eta: safeOrder.eta
      }
    });
  } else if (newStage === 'Customs Clearance') {
    await triggerTradeAutomatedEmail({
      trigger_type: 'customs_cleared',
      order_no: safeOrder.order_no,
      recipient_name: safeOrder.client_name,
      recipient_email: safeOrder.client_email,
    });
  } else if (newStage === 'Delivered') {
    await triggerTradeAutomatedEmail({
      trigger_type: 'delivered',
      order_no: safeOrder.order_no,
      recipient_name: safeOrder.client_name,
      recipient_email: safeOrder.client_email,
    });
  }

  window.dispatchEvent(new Event('ferex_trade_orders_change'));
  return safeOrder;
}

export async function updateTradeOrder(orderId: string, updates: Partial<TradeOrder>): Promise<TradeOrder | null> {
  const current = await getTradeOrders();
  let updatedOrder: TradeOrder | null = null;

  const updated = current.map(o => {
    if (o.id === orderId || o.order_no === orderId) {
      updatedOrder = { ...o, ...updates, updated_at: new Date().toISOString() };
      return updatedOrder;
    }
    return o;
  });

  if (!updatedOrder) return null;

  try { localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_orders').update({ ...updates, updated_at: new Date().toISOString() }).or(`id.eq.${orderId},order_no.eq.${orderId}`);
  } catch {}

  window.dispatchEvent(new Event('ferex_trade_orders_change'));
  return updatedOrder;
}

export async function deleteTradeOrder(orderId: string): Promise<boolean> {
  const current = await getTradeOrders();
  const filtered = current.filter(o => o.id !== orderId && o.order_no !== orderId);
  try { localStorage.setItem('ferex_trade_orders_v2', JSON.stringify(filtered)); } catch {}
  try {
    await supabase.from('trade_orders').delete().or(`id.eq.${orderId},order_no.eq.${orderId}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_orders_change'));
  return true;
}

// ─── 2. DOCUMENTS HANDLING & VERIFICATION ───────────────────────────────────

export async function getTradeDocuments(): Promise<TradeDocument[]> {
  initTradeDataIfEmpty();
  let localDocs: TradeDocument[] = [];
  const local = localStorage.getItem('ferex_trade_documents_v2');
  if (local) {
    try { localDocs = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const ld of localDocs) {
        if (!merged.some(m => m.id === ld.id)) {
          merged.push(ld);
        }
      }
      try { localStorage.setItem('ferex_trade_documents_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localDocs;
  } catch {
    return localDocs;
  }
}

export async function uploadTradeDocument(doc: Partial<TradeDocument>, autoSendToClient: boolean = true): Promise<TradeDocument> {
  const newId = uid();
  const created: TradeDocument = {
    id: newId,
    order_id: doc.order_id || '',
    order_no: doc.order_no || 'TRD-GENERAL',
    client_name: doc.client_name || 'Global Trade Client',
    doc_type: doc.doc_type || 'Commercial Invoice',
    doc_number: doc.doc_number || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: doc.file_name || `${doc.doc_type?.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.order_no}.pdf`,
    file_url: doc.file_url || '',
    file_size: doc.file_size || '320 KB',
    status: doc.status || 'Submitted',
    rejection_reason: '',
    notes: doc.notes || '',
    uploaded_by: doc.uploaded_by || 'Staff Trade Officer',
    verified_by: doc.verified_by || (doc.status === 'Verified' ? 'Trade Admin' : ''),
    verified_at: doc.status === 'Verified' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : '',
    sent_to_client: autoSendToClient,
    sent_to_client_at: autoSendToClient ? new Date().toISOString().replace('T', ' ').slice(0, 16) : '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getTradeDocuments();
  const updated = [created, ...current.filter(d => d.id !== created.id)];
  try { localStorage.setItem('ferex_trade_documents_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_documents').insert(created); } catch {}

  // Auto-trigger client email if marked sent
  if (autoSendToClient) {
    const orders = await getTradeOrders();
    const targetOrder = orders.find(o => o.order_no === created.order_no);
    await triggerTradeAutomatedEmail({
      trigger_type: 'document_ready',
      order_no: created.order_no,
      recipient_name: created.client_name,
      recipient_email: targetOrder?.client_email || 'client@trade.com',
      custom_data: { doc_type: created.doc_type, file_name: created.file_name }
    });
  }

  window.dispatchEvent(new Event('ferex_trade_documents_change'));
  return created;
}

export async function updateTradeDocumentStatus(
  docId: string,
  status: TradeDocInternalStatus,
  verifiedBy: string = 'Ferex Trade Admin',
  rejectionReason?: string
): Promise<TradeDocument | null> {
  const current = await getTradeDocuments();
  let updatedDoc: TradeDocument | null = null;

  const updated = current.map(d => {
    if (d.id === docId) {
      updatedDoc = {
        ...d,
        status,
        verified_by: status === 'Verified' ? verifiedBy : d.verified_by,
        verified_at: status === 'Verified' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : d.verified_at,
        rejection_reason: status === 'Rejected' ? (rejectionReason || 'Document details discrepancy') : '',
        updated_at: new Date().toISOString(),
      };
      return updatedDoc;
    }
    return d;
  });

  if (!updatedDoc) return null;

  try { localStorage.setItem('ferex_trade_documents_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_documents').update({
      status,
      verified_by: (updatedDoc as any).verified_by,
      verified_at: (updatedDoc as any).verified_at,
      rejection_reason: (updatedDoc as any).rejection_reason,
      updated_at: new Date().toISOString()
    }).eq('id', docId);
  } catch {}

  window.dispatchEvent(new Event('ferex_trade_documents_change'));
  return updatedDoc;
}

export async function deleteTradeDocument(docId: string): Promise<boolean> {
  const current = await getTradeDocuments();
  const filtered = current.filter(d => d.id !== docId);
  try { localStorage.setItem('ferex_trade_documents_v2', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_documents').delete().eq('id', docId); } catch {}
  window.dispatchEvent(new Event('ferex_trade_documents_change'));
  return true;
}

// ─── 3. TASK ASSIGNMENT (STAFF / OFFICERS) ──────────────────────────────────

export async function getTradeTasks(): Promise<TradeTask[]> {
  initTradeDataIfEmpty();
  let localTasks: TradeTask[] = [];
  const local = localStorage.getItem('ferex_trade_tasks_v2');
  if (local) {
    try { localTasks = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const lt of localTasks) {
        if (!merged.some(m => m.id === lt.id)) {
          merged.push(lt);
        }
      }
      try { localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localTasks;
  } catch {
    return localTasks;
  }
}

export async function createTradeTask(task: Partial<TradeTask>): Promise<TradeTask> {
  const newId = uid();
  const created: TradeTask = {
    id: newId,
    title: task.title || 'Execute Trade Operation Task',
    category: task.category || 'Order Handling',
    order_no: task.order_no || '',
    client_name: task.client_name || '',
    assigned_staff_name: task.assigned_staff_name || 'Elena Rostova',
    assigned_staff_email: task.assigned_staff_email || 'elena.rostova@ferex.com',
    priority: task.priority || 'Medium',
    status: task.status || 'Pending',
    due_date: task.due_date || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    notes: task.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getTradeTasks();
  const updated = [created, ...current.filter(t => t.id !== created.id)];
  try { localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_tasks').insert(created); } catch {}
  window.dispatchEvent(new Event('ferex_trade_tasks_change'));
  return created;
}

export async function updateTradeTaskStatus(taskId: string, status: TaskStatus): Promise<TradeTask | null> {
  const current = await getTradeTasks();
  let updatedTask: TradeTask | null = null;

  const updated = current.map(t => {
    if (t.id === taskId) {
      updatedTask = { ...t, status, updated_at: new Date().toISOString() };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) return null;

  try { localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId); } catch {}
  window.dispatchEvent(new Event('ferex_trade_tasks_change'));
  return updatedTask;
}

export async function reassignTradeTask(taskId: string, newStaffName: string, newStaffEmail: string): Promise<TradeTask | null> {
  const current = await getTradeTasks();
  let updatedTask: TradeTask | null = null;

  const updated = current.map(t => {
    if (t.id === taskId) {
      updatedTask = {
        ...t,
        assigned_staff_name: newStaffName,
        assigned_staff_email: newStaffEmail,
        updated_at: new Date().toISOString()
      };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) return null;

  try { localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_tasks').update({
      assigned_staff_name: newStaffName,
      assigned_staff_email: newStaffEmail,
      updated_at: new Date().toISOString()
    }).eq('id', taskId);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_tasks_change'));
  return updatedTask;
}

export async function deleteTradeTask(taskId: string): Promise<boolean> {
  const current = await getTradeTasks();
  const filtered = current.filter(t => t.id !== taskId);
  try { localStorage.setItem('ferex_trade_tasks_v2', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_tasks').delete().eq('id', taskId); } catch {}
  window.dispatchEvent(new Event('ferex_trade_tasks_change'));
  return true;
}

// ─── 4. MANUAL TICKET LOGGING ───────────────────────────────────────────────

export async function getTradeTickets(): Promise<TradeTicket[]> {
  initTradeDataIfEmpty();
  let localTickets: TradeTicket[] = [];
  const local = localStorage.getItem('ferex_trade_tickets_v2');
  if (local) {
    try { localTickets = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const lt of localTickets) {
        if (!merged.some(m => m.id === lt.id)) {
          merged.push(lt);
        }
      }
      try { localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localTickets;
  } catch {
    return localTickets;
  }
}

export async function createTradeTicket(ticket: Partial<TradeTicket>): Promise<TradeTicket> {
  const newId = uid();
  const ticketNo = `TCK-2026-${Math.floor(100 + Math.random() * 900)}`;
  const created: TradeTicket = {
    id: newId,
    ticket_no: ticketNo,
    client_name: ticket.client_name || 'Global Trade Client',
    client_contact: ticket.client_contact || '',
    order_no: ticket.order_no || '',
    channel: ticket.channel || 'Phone Call',
    subject: ticket.subject || 'Client Inquiry / Logistics Ticket',
    description: ticket.description || '',
    priority: ticket.priority || 'Medium',
    status: ticket.status || 'Open',
    assigned_staff_name: ticket.assigned_staff_name || 'Elena Rostova',
    assigned_staff_email: ticket.assigned_staff_email || 'elena.rostova@ferex.com',
    resolution_notes: '',
    logged_by: ticket.logged_by || 'Trade Administrator',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getTradeTickets();
  const updated = [created, ...current.filter(t => t.id !== created.id)];
  try { localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_tickets').insert(created); } catch {}
  window.dispatchEvent(new Event('ferex_trade_tickets_change'));
  return created;
}

export async function updateTradeTicketStatus(
  ticketId: string,
  status: TicketStatus,
  resolutionNotes?: string
): Promise<TradeTicket | null> {
  const current = await getTradeTickets();
  let updatedTicket: TradeTicket | null = null;

  const updated = current.map(t => {
    if (t.id === ticketId || t.ticket_no === ticketId) {
      updatedTicket = {
        ...t,
        status,
        resolution_notes: resolutionNotes !== undefined ? resolutionNotes : t.resolution_notes,
        updated_at: new Date().toISOString()
      };
      return updatedTicket;
    }
    return t;
  });

  if (!updatedTicket) return null;

  try { localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_tickets').update({
      status,
      resolution_notes: (updatedTicket as any).resolution_notes,
      updated_at: new Date().toISOString()
    }).or(`id.eq.${ticketId},ticket_no.eq.${ticketId}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_tickets_change'));
  return updatedTicket;
}

export async function reassignTradeTicket(
  ticketId: string,
  newStaffName: string,
  newStaffEmail: string
): Promise<TradeTicket | null> {
  const current = await getTradeTickets();
  let updatedTicket: TradeTicket | null = null;

  const updated = current.map(t => {
    if (t.id === ticketId || t.ticket_no === ticketId) {
      updatedTicket = {
        ...t,
        assigned_staff_name: newStaffName,
        assigned_staff_email: newStaffEmail,
        updated_at: new Date().toISOString()
      };
      return updatedTicket;
    }
    return t;
  });

  if (!updatedTicket) return null;

  try { localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_tickets').update({
      assigned_staff_name: newStaffName,
      assigned_staff_email: newStaffEmail,
      updated_at: new Date().toISOString()
    }).or(`id.eq.${ticketId},ticket_no.eq.${ticketId}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_tickets_change'));
  return updatedTicket;
}

export async function deleteTradeTicket(ticketId: string): Promise<boolean> {
  const current = await getTradeTickets();
  const filtered = current.filter(t => t.id !== ticketId && t.ticket_no !== ticketId);
  try { localStorage.setItem('ferex_trade_tickets_v2', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_tickets').delete().or(`id.eq.${ticketId},ticket_no.eq.${ticketId}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_tickets_change'));
  return true;
}

// ─── 5. PAYMENTS & ADVANCE / BALANCE TRACKING ───────────────────────────────

export async function getTradePayments(): Promise<TradePaymentRecord[]> {
  initTradeDataIfEmpty();
  let localPayments: TradePaymentRecord[] = [];
  const local = localStorage.getItem('ferex_trade_payments_v2');
  if (local) {
    try { localPayments = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const lp of localPayments) {
        if (!merged.some(m => m.id === lp.id)) {
          merged.push(lp);
        }
      }
      try { localStorage.setItem('ferex_trade_payments_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localPayments;
  } catch {
    return localPayments;
  }
}

export async function recordTradePayment(payment: {
  order_no: string;
  client_name: string;
  type: 'Advance Payment' | 'Balance Settlement' | 'Full Payment' | 'LC Drawdown';
  amount: number;
  currency: string;
  payment_method: string;
  transaction_ref?: string;
  lc_reference?: string;
  notes?: string;
}): Promise<TradePaymentRecord> {
  const newId = uid();
  const receiptNo = `RCP-${payment.order_no}-${payment.type.startsWith('Adv') ? 'ADV' : 'BAL'}-${Math.floor(100 + Math.random() * 900)}`;

  const created: TradePaymentRecord = {
    id: newId,
    order_no: payment.order_no,
    client_name: payment.client_name,
    type: payment.type,
    amount: Number(payment.amount) || 0,
    currency: payment.currency || 'USD',
    payment_method: payment.payment_method || 'SWIFT Wire Transfer',
    transaction_ref: payment.transaction_ref || `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
    lc_reference: payment.lc_reference || '',
    receipt_no: receiptNo,
    payment_date: new Date().toISOString().split('T')[0],
    notes: payment.notes || '',
    created_at: new Date().toISOString(),
  };

  const current = await getTradePayments();
  const updated = [created, ...current.filter(p => p.id !== created.id)];
  try { localStorage.setItem('ferex_trade_payments_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_payments').insert(created); } catch {}

  // Update order's paid amounts and status
  const orders = await getTradeOrders();
  const targetOrder = orders.find(o => o.order_no === payment.order_no);
  if (targetOrder) {
    let newAdvPaid = targetOrder.advance_paid || 0;
    let newBalPaid = targetOrder.balance_paid || 0;

    if (payment.type === 'Advance Payment') {
      newAdvPaid += created.amount;
    } else if (payment.type === 'Balance Settlement') {
      newBalPaid += created.amount;
    } else if (payment.type === 'Full Payment' || payment.type === 'LC Drawdown') {
      newAdvPaid = targetOrder.advance_amount;
      newBalPaid = targetOrder.balance_amount;
    }

    await updateTradeOrder(targetOrder.id, {
      advance_paid: newAdvPaid,
      advance_status: newAdvPaid >= targetOrder.advance_amount ? 'Paid' : 'Pending',
      balance_paid: newBalPaid,
      balance_status: newBalPaid >= targetOrder.balance_amount ? 'Paid' : 'Pending',
    });

    // Trigger Payment Received Receipt Email
    await triggerTradeAutomatedEmail({
      trigger_type: 'payment_received',
      order_no: payment.order_no,
      recipient_name: payment.client_name,
      recipient_email: targetOrder.client_email || 'client@trade.com',
      custom_data: {
        receipt_no: receiptNo,
        amount: created.amount,
        currency: created.currency,
        type: payment.type
      }
    });
  }

  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return created;
}

export async function sendPaymentReminder(orderNo: string): Promise<boolean> {
  const orders = await getTradeOrders();
  const order = orders.find(o => o.order_no === orderNo);
  if (!order) return false;

  await triggerTradeAutomatedEmail({
    trigger_type: 'payment_reminder',
    order_no: order.order_no,
    recipient_name: order.client_name,
    recipient_email: order.client_email,
    custom_data: {
      balance_due: order.balance_amount - (order.balance_paid || 0),
      currency: order.currency,
      terms: order.payment_terms_desc
    }
  });

  return true;
}

// ─── 6. AUTOMATED EMAILS ENGINE ─────────────────────────────────────────────

export async function getTradeAutomatedEmails(): Promise<TradeAutomatedEmail[]> {
  initTradeDataIfEmpty();
  let localEmails: TradeAutomatedEmail[] = [];
  const local = localStorage.getItem('ferex_trade_emails_v2');
  if (local) {
    try { localEmails = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_automated_emails')
      .select('*')
      .order('sent_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const le of localEmails) {
        if (!merged.some(m => m.id === le.id)) {
          merged.push(le);
        }
      }
      try { localStorage.setItem('ferex_trade_emails_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localEmails;
  } catch {
    return localEmails;
  }
}

export async function triggerTradeAutomatedEmail(params: {
  trigger_type: AutomatedEmailTrigger;
  order_no: string;
  recipient_name: string;
  recipient_email: string;
  custom_data?: any;
}): Promise<TradeAutomatedEmail> {
  const newId = uid();
  const { trigger_type, order_no, recipient_name, recipient_email, custom_data = {} } = params;

  let subject = `FEREX Global Trade Update: Order ${order_no}`;
  let content = `Dear ${recipient_name},\n\nThis is an automated operational notification regarding your Trade Order ${order_no}.`;
  let label = 'Operational Update';

  switch (trigger_type) {
    case 'order_confirmed':
      label = 'Order Confirmed';
      subject = `Official Confirmation: Global Trade Order ${order_no} Confirmed`;
      content = `Dear ${recipient_name},\n\nWe are pleased to confirm that your trade order ${order_no} has been confirmed. Production and maritime logistics have been initiated.\n\nAccess live status: /trade/client-portal`;
      break;
    case 'document_ready':
      label = 'Document Ready / Sent';
      subject = `Document Ready: ${custom_data.doc_type || 'Trade Document'} Issued for Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nThe ${custom_data.doc_type || 'document'} (${custom_data.file_name || 'file'}) is now ready and verified for Order ${order_no}. You can download it directly from your Client Portal.`;
      break;
    case 'invoice_generated':
      label = 'Invoice Generated';
      subject = `Commercial Invoice Generated for Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nThe official invoice for Order ${order_no} is generated. Please review payment terms and banking coordinates.`;
      break;
    case 'payment_received':
      label = 'Payment Received (Receipt)';
      subject = `Payment Confirmed: Official Receipt ${custom_data.receipt_no || ''} for Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nWe gratefully acknowledge receipt of your ${custom_data.type || 'payment'} of ${custom_data.currency || 'USD'} ${Number(custom_data.amount || 0).toLocaleString()} for Order ${order_no}. Receipt #${custom_data.receipt_no || ''} is archived in your Client Portal.`;
      break;
    case 'payment_reminder':
      label = 'Payment Reminder (Balance Due)';
      subject = `Payment Reminder: Pending Balance for Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nThis is a friendly reminder that a balance amount of ${custom_data.currency || 'USD'} ${Number(custom_data.balance_due || 0).toLocaleString()} is due for Order ${order_no} per agreed terms (${custom_data.terms || 'before cargo release'}).`;
      break;
    case 'shipped':
      label = 'Shipped (Tracking Live)';
      subject = `Cargo Dispatched: Shipment Shipped for Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nYour cargo has been boarded on ${custom_data.carrier || 'Carrier'} ${custom_data.vessel || ''}. Tracking Reference: ${custom_data.tracking || 'Active'}. Estimated Arrival: ${custom_data.eta || 'On Schedule'}. Track live on /trade/client-portal`;
      break;
    case 'customs_cleared':
      label = 'Customs Cleared';
      subject = `Customs Clearance Complete: Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nImport customs clearance formalities have concluded successfully for Order ${order_no}. Cargo is cleared for onward port dispatch.`;
      break;
    case 'delivered':
      label = 'Delivered & Completed';
      subject = `Delivery Completed: Order ${order_no}`;
      content = `Dear ${recipient_name},\n\nConsignment for Order ${order_no} has been safely delivered and signed off. Thank you for partnering with FEREX Global Trade.`;
      break;
  }

  const emailRecord: TradeAutomatedEmail = {
    id: newId,
    trigger_type,
    trigger_label: label,
    order_no,
    recipient_name,
    recipient_email: recipient_email || 'client@trade.com',
    subject,
    content_preview: content,
    sent_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: 'Delivered',
  };

  const current = await getTradeAutomatedEmails();
  const updated = [emailRecord, ...current.filter(e => e.id !== emailRecord.id)];
  try { localStorage.setItem('ferex_trade_emails_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_automated_emails').insert(emailRecord); } catch {}
  window.dispatchEvent(new Event('ferex_trade_emails_change'));
  return emailRecord;
}

// ─── 7. TRADE CRM PARTNERS & CLIENT PORTAL KEYS ─────────────────────────────

export async function getTradeClients(): Promise<TradeClientPartner[]> {
  initTradeDataIfEmpty();
  let localClients: TradeClientPartner[] = [];
  const local = localStorage.getItem('ferex_trade_clients_v2');
  if (local) {
    try { localClients = JSON.parse(local); } catch {}
  } else {
    // Seed default partners
    localClients = [
      {
        id: 'crm-001',
        company_name: 'Baltic Grain Sp. z o.o.',
        contact_person: 'Marek Wojcik',
        email: 'trade@balticgrain.pl',
        phone: '+48 58 660 4100',
        country: 'Poland',
        city: 'Gdansk',
        category: 'Buyer / Importer',
        portal_active: true,
        temp_password: 'TradePass#7870',
        created_at: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'crm-002',
        company_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        contact_person: 'Dr. Klaus Richter',
        email: 'procurement@hamburg-steel.de',
        phone: '+49 40 3344 5500',
        country: 'Germany',
        city: 'Hamburg',
        category: 'Buyer / Importer',
        portal_active: true,
        temp_password: 'TradePass#9941',
        created_at: '2026-08-15T12:00:00.000Z',
      },
      {
        id: 'crm-003',
        company_name: 'Dubai Gold & Maritime Trading LLC',
        contact_person: 'Tariq Al-Mansoor',
        email: 'operations@dubaimaritime.ae',
        phone: '+971 4 883 9920',
        country: 'UAE',
        city: 'Dubai',
        category: 'Buyer / Importer',
        portal_active: true,
        temp_password: 'TradePass#3320',
        created_at: '2026-07-10T09:00:00.000Z',
      }
    ];
    localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(localClients));
  }

  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const lc of localClients) {
        if (!merged.some(m => m.id === lc.id || m.email === lc.email)) {
          merged.push(lc);
        }
      }
      try { localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localClients;
  } catch {
    return localClients;
  }
}

export async function provisionTradeClientLogin(partner: {
  id?: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  country?: string;
}): Promise<{ email: string; tempPassword: string; companyName: string }> {
  const cleanEmail = partner.email.trim().toLowerCase();
  const tempPassword = `TradePass#${Math.floor(1000 + Math.random() * 9000)}`;
  const companyName = partner.company_name || 'Global Trade Partner';
  const fullName = partner.contact_person || partner.company_name;

  const currentClients = await getTradeClients();
  const existing = currentClients.find(c => c.email.toLowerCase() === cleanEmail || c.id === partner.id);
  const partnerId = existing?.id || partner.id || uid();

  const clientPayload: TradeClientPartner = {
    id: partnerId,
    company_name: companyName,
    contact_person: fullName,
    email: cleanEmail,
    phone: partner.phone || '+48 58 000 0000',
    country: partner.country || 'International',
    city: 'Trade Port Desk',
    category: 'Buyer / Importer',
    portal_active: true,
    temp_password: tempPassword,
    created_at: new Date().toISOString(),
  };

  const updated = [clientPayload, ...currentClients.filter(c => c.id !== partnerId && c.email.toLowerCase() !== cleanEmail)];
  try { localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(updated)); } catch {}

  // Store in universal local credentials registry
  try {
    localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
      email: cleanEmail,
      password: tempPassword,
      role: 'trade_client',
      fullName,
      full_name: fullName,
      company_name: companyName,
      partner_id: partnerId,
      require_password_reset: false,
    }));
  } catch {}

  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'trade_client',
      full_name: fullName,
      department: `Trade:${companyName}`,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch {}

  try {
    await supabase.from('trade_clients').upsert(clientPayload, { onConflict: 'id' });
  } catch {}

  window.dispatchEvent(new Event('ferex_trade_clients_change'));
  return {
    email: cleanEmail,
    tempPassword,
    companyName
  };
}

// ─── 8. CENTRAL PANEL CROSS-BUSINESS SUMMARY ────────────────────────────────

export async function getCentralTradeSummary() {
  const [orders, docs, tasks, tickets, payments] = await Promise.all([
    getTradeOrders(),
    getTradeDocuments(),
    getTradeTasks(),
    getTradeTickets(),
    getTradePayments()
  ]);

  const totalOrderValueUSD = orders.reduce((sum, o) => {
    const rate = o.currency === 'EUR' ? 1.08 : o.currency === 'INR' ? 0.012 : o.currency === 'GBP' ? 1.30 : 1;
    return sum + (o.total_amount * rate);
  }, 0);

  const pendingPaymentsUSD = orders.reduce((sum, o) => {
    const rate = o.currency === 'EUR' ? 1.08 : o.currency === 'INR' ? 0.012 : o.currency === 'GBP' ? 1.30 : 1;
    const unpaidBal = Math.max(0, o.balance_amount - (o.balance_paid || 0));
    const unpaidAdv = o.advance_status === 'Pending' ? o.advance_amount : 0;
    return sum + ((unpaidBal + unpaidAdv) * rate);
  }, 0);

  const inTransitCount = orders.filter(o => o.stage === 'Shipped' || o.stage === 'Customs Clearance').length;
  const overdueDocsCount = docs.filter(d => d.status === 'Pending' || d.status === 'Rejected').length;
  const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;

  return {
    totalOrderValueUSD,
    pendingPaymentsUSD,
    inTransitCount,
    overdueDocsCount,
    openTicketsCount,
    pendingTasksCount,
    totalOrdersCount: orders.length,
    orders,
    tasks,
    tickets,
    documents: docs,
    payments
  };
}

// Backward compatibility aliases
export const getTradeShipments = getTradeOrders;
export const createTradeShipment = createTradeOrder;
export const updateTradeShipmentStatus = advanceTradeOrderStage;
export const deleteTradeShipment = deleteTradeOrder;
export const getTradeInvoices = async (...args: any[]): Promise<any[]> => [];
export const createTradeInvoice = async (...args: any[]): Promise<any> => ({ id: 'inv-legacy', invoice_no: 'INV-TRD-LEGACY' });
export const updateTradeInvoice = async (...args: any[]): Promise<any> => true;
export const getTradePackingLists = async (...args: any[]): Promise<any[]> => [];
export const createTradePackingList = async (...args: any[]): Promise<any> => ({ id: 'pl-legacy', pl_number: 'PL-TRD-LEGACY' });
export const deleteTradePackingList = async (...args: any[]): Promise<any> => true;
export const getTradeBillsOfLading = async (...args: any[]): Promise<any[]> => [];
export const createTradeBillOfLading = async (...args: any[]): Promise<any> => ({ id: 'bl-legacy', bl_number: 'BL-TRD-LEGACY' });
export const updateTradeBillOfLadingStatus = async (...args: any[]): Promise<any> => true;
export const deleteTradeBillOfLading = async (...args: any[]): Promise<any> => true;
export const getTradeCertificates = async (...args: any[]): Promise<any[]> => [];
export const createTradeCertificate = async (...args: any[]): Promise<any> => ({ id: 'cert-legacy', certificate_no: 'CERT-TRD-LEGACY' });
export const deleteTradeCertificate = async (...args: any[]): Promise<any> => true;
export const getTradeLettersOfCredit = async (...args: any[]): Promise<any[]> => [];
export const createTradeLetterOfCredit = async (...args: any[]): Promise<any> => ({ id: 'lc-legacy', lc_number: 'LC-TRD-LEGACY' });
export const updateTradeLetterOfCreditStatus = async (...args: any[]): Promise<any> => true;
export const deleteTradeLetterOfCredit = async (...args: any[]): Promise<any> => true;
export const getTradeCRMContacts = getTradeClients;

export async function createTradeCRMContact(partner: Partial<TradeClientPartner>): Promise<TradeClientPartner> {
  const currentClients = await getTradeClients();
  const cleanEmail = (partner.email || '').trim().toLowerCase();
  const companyName = partner.company_name || 'Global Trade Partner';
  const partnerId = partner.id || uid();

  const newPartner: TradeClientPartner = {
    id: partnerId,
    company_name: companyName,
    contact_person: partner.contact_person || companyName,
    email: cleanEmail || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@trade.com`,
    phone: partner.phone || '+48 58 000 0000',
    country: partner.country || 'International',
    city: partner.city || 'Trade Port Desk',
    category: partner.category || 'Buyer / Importer',
    portal_active: true,
    created_at: new Date().toISOString(),
  };

  const updated = [newPartner, ...currentClients.filter(c => c.id !== partnerId && c.email.toLowerCase() !== cleanEmail)];
  try { localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_clients').upsert(newPartner, { onConflict: 'id' }); } catch {}

  window.dispatchEvent(new Event('ferex_trade_clients_change'));
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return newPartner;
}

export async function updateTradeCRMContact(id: string, updates: Partial<TradeClientPartner>): Promise<boolean> {
  const currentClients = await getTradeClients();
  const updated = currentClients.map(c => {
    if (c.id === id || c.company_name === id) {
      return { ...c, ...updates };
    }
    return c;
  });

  try { localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_clients').update(updates).or(`id.eq.${id},company_name.eq.${id}`); } catch {}

  window.dispatchEvent(new Event('ferex_trade_clients_change'));
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return true;
}

export async function deleteTradeCRMContact(id: string): Promise<boolean> {
  const currentClients = await getTradeClients();
  const filtered = currentClients.filter(c => c.id !== id && c.company_name !== id);

  try { localStorage.setItem('ferex_trade_clients_v2', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_clients').delete().or(`id.eq.${id},company_name.eq.${id}`); } catch {}

  window.dispatchEvent(new Event('ferex_trade_clients_change'));
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return true;
}
export const getTradeMessages = async (convId: string) => {
  const local = localStorage.getItem(`ferex_trade_msgs_${convId}`);
  if (local) {
    try { return JSON.parse(local); } catch {}
  }
  return [
    {
      id: 'msg-1',
      sender_name: 'Elena Rostova',
      contact_name: 'Baltic Logistics Officer',
      message: 'Container seals verified and loaded on MSC Gülsün.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      is_self: false
    }
  ];
};
export const sendTradeMessage = async (msg: any) => {
  const convId = msg.conversation_id || '1';
  const existing = await getTradeMessages(convId);
  const newMsg = {
    id: uid(),
    ...msg,
    created_at: new Date().toISOString()
  };
  const updated = [...existing, newMsg];
  localStorage.setItem(`ferex_trade_msgs_${convId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_msgs_change'));
  return newMsg;
};
export const getTradeNotifications = async () => {
  const emails = await getTradeAutomatedEmails();
  return emails.map(e => ({
    id: e.id,
    title: `${e.trigger_label} — Order ${e.order_no}`,
    description: e.subject,
    category: e.trigger_type.toUpperCase(),
    created_at: e.sent_at,
    is_read: false
  }));
};
export const createTradeNotification = async () => true;
export const TRADE_MASTER_CARRIERS = ['MSC (Mediterranean Shipping Company)', 'Maersk Line', 'CMA CGM', 'Hapag-Lloyd', 'COSCO Shipping', 'ONE (Ocean Network Express)', 'Evergreen Line'];
export const TRADE_MASTER_VESSELS = ['MSC Gülsün (IMO: 9839438)', 'Maersk Mc-Kinney Moller (IMO: 9619907)', 'CMA CGM Antoine de Saint Exupery', 'Hapag-Lloyd Al Jmeliyah', 'COSCO Universe'];
export const TRADE_MASTER_PORTS = ['Port of Gdansk, Poland', 'Port of Hamburg, Germany', 'Port of Nhava Sheva (JNPT), India', 'Port of Chennai, India', 'Port of Jebel Ali, Dubai', 'Port of Rotterdam, Netherlands', 'Port of Singapore'];
export const TRADE_MASTER_BANKS = ['BNP Paribas Trade Finance Paris', 'HSBC London Global Trade Desk', 'Deutsche Bank AG Frankfurt', 'State Bank of India Overseas Banking', 'Emirates NBD Trade Finance Dubai', 'Santander Trade Services Madrid', 'Standard Chartered Global Trade'];
export const TRADE_MASTER_CURRENCIES = TRADE_CURRENCIES;
export const TRADE_MASTER_INCOTERMS = TRADE_INCOTERMS;
export const TRADE_BL_STATUSES = ['Draft', 'Issued', 'Clean On-Board Signed', 'Released', 'Surrendered', 'Accomplished'];
export const TRADE_MASTER_CERT_TYPES = ['Certificate of Origin (Non-Preferential)', 'Phytosanitary Certificate', 'Quality & Inspection Analysis Certificate', 'EUR.1 Movement Certificate', 'Fumigation & Pest Control Certificate'];
export const TRADE_MASTER_PARTNER_CATEGORIES = ['Buyer / Importer', 'Seller / Exporter', 'Logistics Partner / Freight Forwarder', 'Trade Finance Bank / Financial Institution'];
export const TRADE_INVOICE_STATUSES = ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue'];
export const TRADE_MASTER_PAYMENT_METHODS = ['SWIFT Wire Transfer (MT103)', 'Letter of Credit (LC)', 'Direct Bank Settlement', 'Corporate Escrow'];

export interface ProvisionedTradeCredential {
  email: string;
  tempPassword: string;
  role?: string;
  fullName?: string;
  companyName: string;
  partnerId?: string;
  requirePasswordReset?: boolean;
  provisionedAt?: string;
}

export function getTradeClientCredentials(partnerId: string): ProvisionedTradeCredential | null {
  const local = localStorage.getItem(`ferex_trade_clients_v2`);
  if (local) {
    try {
      const clients = JSON.parse(local);
      const found = clients.find((c: any) => c.id === partnerId);
      if (found) {
        return {
          email: found.email,
          tempPassword: found.temp_password || 'TradePass#7870',
          companyName: found.company_name,
          fullName: found.contact_person,
        };
      }
    } catch {}
  }
  return null;
}

export async function getTradeDossier(type?: string, id?: string) {
  const [orders, docs, payments] = await Promise.all([
    getTradeOrders(),
    getTradeDocuments(),
    getTradePayments()
  ]);
  return {
    shipments: orders,
    orders,
    invoices: [],
    packingLists: [],
    billsOfLading: [],
    certificates: [],
    lettersOfCredit: [],
    payments,
    documents: docs
  };
}

export async function globalSearchTrade(query: string) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const [orders, docs, tasks, tickets] = await Promise.all([
    getTradeOrders(),
    getTradeDocuments(),
    getTradeTasks(),
    getTradeTickets()
  ]);

  const results: Array<{ title: string; subtitle: string; category: string; path: string }> = [];

  for (const o of orders) {
    if (o.order_no.toLowerCase().includes(q) || o.client_name.toLowerCase().includes(q) || o.commodity.toLowerCase().includes(q)) {
      results.push({
        title: `${o.order_no} — ${o.client_name}`,
        subtitle: `${o.commodity} • Stage: ${o.stage}`,
        category: 'Order',
        path: '/trade/shipments'
      });
    }
  }

  for (const d of docs) {
    if ((d.doc_number && d.doc_number.toLowerCase().includes(q)) || (d.doc_type && d.doc_type.toLowerCase().includes(q)) || (d.order_no && d.order_no.toLowerCase().includes(q)) || (d.client_name && d.client_name.toLowerCase().includes(q))) {
      results.push({
        title: `${d.doc_type || 'Document'} (${d.doc_number || 'N/A'})`,
        subtitle: `Order: ${d.order_no} • Status: ${d.status}`,
        category: 'Document',
        path: '/trade/documents'
      });
    }
  }

  for (const t of tasks) {
    if ((t.title && t.title.toLowerCase().includes(q)) || (t.assigned_staff_name && t.assigned_staff_name.toLowerCase().includes(q)) || (t.order_no && t.order_no.toLowerCase().includes(q))) {
      results.push({
        title: t.title,
        subtitle: `Assigned: ${t.assigned_staff_name} • ${t.status}`,
        category: 'Task',
        path: '/trade/tasks'
      });
    }
  }


  for (const tk of tickets) {
    if (tk.ticket_no.toLowerCase().includes(q) || tk.subject.toLowerCase().includes(q) || tk.client_name.toLowerCase().includes(q)) {
      results.push({
        title: `${tk.ticket_no} — ${tk.subject}`,
        subtitle: `Client: ${tk.client_name} • ${tk.status}`,
        category: 'Ticket',
        path: '/trade/tickets'
      });
    }
  }

  return results.slice(0, 10);
}

export const updateTradeCertificateStatus = async (...args: any[]) => true;
export const updateTradeInvoiceStatus = async (...args: any[]) => true;
export const deleteTradeInvoice = async (...args: any[]) => true;
export const createTradePayment = async (payment: any) => {
  return recordTradePayment({
    order_no: payment.order_no || payment.shipment_reference || 'TRD-GENERAL',
    client_name: payment.client_name || 'Trade Partner',
    type: payment.type || (payment.amount_paid ? 'Advance Payment' : 'Full Payment'),
    amount: Number(payment.amount || payment.amount_paid || payment.total_amount) || 0,
    currency: payment.currency || 'USD',
    payment_method: payment.payment_method || 'SWIFT Wire Transfer',
    transaction_ref: payment.transaction_ref || payment.swift_reference,
    lc_reference: payment.lc_reference,
    notes: payment.notes
  });
};

