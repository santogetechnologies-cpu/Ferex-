import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Seed Guard Helpers ──────────────────────────────────────────────────────
function isSeeded(entity: string): boolean {
  try { return localStorage.getItem('ferex_trade_seeded_' + entity) === 'true'; } catch { return false; }
}
function markSeeded(entity: string): void {
  try { localStorage.setItem('ferex_trade_seeded_' + entity, 'true'); } catch {}
}

// ─── Default Real-World Seed Data for Trade ─────────────────────────────────
const DEFAULT_TRADE_SHIPMENTS = [
  {
    id: 'SHP-9821',
    shipment_no: 'SHP-9821',
    container_no: 'MSKU-9821045',
    carrier: 'Maersk Line',
    carrier_vessel: 'MSC Oscar (V.8821)',
    origin_port: 'Port of Gdansk, Poland',
    destination_port: 'Port of Rotterdam, Netherlands',
    cargo_description: 'Industrial Bearing Assemblies & Heavy Machinery',
    commodity: 'Industrial Bearing Assemblies & Heavy Machinery',
    cargo_weight_kg: 24500,
    container_count: 1,
    transport_mode: 'Maritime',
    incoterm: 'FOB',
    shipment_status: 'In Transit',
    status: 'In Transit',
    eta: '2026-09-18',
    etd: '2026-09-02',
    cargo_value: 4500000,
    currency: 'INR',
    created_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 'SHP-9822',
    shipment_no: 'SHP-9822',
    container_no: 'CMAU-4412093',
    carrier: 'CMA CGM Logistics',
    carrier_vessel: 'CMA CGM Antoine de Saint Exupery',
    origin_port: 'Hamburg Port, Germany',
    destination_port: 'Port of Antwerp, Belgium',
    cargo_description: 'Precision Hydraulic Valves & Electronics',
    commodity: 'Precision Hydraulic Valves & Electronics',
    cargo_weight_kg: 18200,
    container_count: 1,
    transport_mode: 'Maritime',
    incoterm: 'CIF',
    shipment_status: 'Loaded on Vessel',
    status: 'Loaded on Vessel',
    eta: '2026-09-22',
    etd: '2026-09-04',
    cargo_value: 3200000,
    currency: 'INR',
    created_at: '2026-09-04T10:00:00Z',
  },
];

const DEFAULT_TRADE_INVOICES = [
  {
    id: 'INV-TRD-40101',
    invoice_no: 'INV-TRD-40101',
    buyer_name: 'Berlin Industrial Supplies GmbH',
    incoterms: 'CIF Rotterdam',
    amount: 4250000,
    currency: 'INR',
    payment_terms: 'Letter of Credit (LC) at Sight',
    status: 'Paid',
    payment_status: 'Paid',
    issue_date: '2026-08-15',
    due_date: '2026-09-28',
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 'INV-TRD-40102',
    invoice_no: 'INV-TRD-40102',
    buyer_name: 'Warsaw Global Logistics Sp. z o.o.',
    incoterms: 'FOB Gdansk',
    amount: 1820000,
    currency: 'INR',
    payment_terms: 'SWIFT Wire (Net 30)',
    status: 'Issued',
    payment_status: 'Issued',
    issue_date: '2026-08-20',
    due_date: '2026-10-01',
    created_at: '2026-08-20T10:00:00Z',
  },
];

const DEFAULT_TRADE_CRM_CONTACTS = [
  {
    id: 'CRM-001',
    company_name: 'Warsaw Global Logistics Sp. z o.o.',
    country: 'Poland',
    contact_person: 'Jan Kowalski',
    email: 'j.kowalski@warsawlogistics.pl',
    phone: '+48 22 890 1234',
    category: 'Freight Forwarder',
    payment_terms: 'LC 60 Days',
    status: 'Active',
    created_at: '2026-08-15T09:00:00Z',
  },
  {
    id: 'CRM-002',
    company_name: 'Berlin Industrial Supplies GmbH',
    country: 'Germany',
    contact_person: 'Hans Weber',
    email: 'h.weber@berlin-supplies.de',
    phone: '+49 30 554 9912',
    category: 'Buyer',
    payment_terms: 'CIF Rotterdam',
    status: 'Active',
    created_at: '2026-08-18T11:30:00Z',
  },
  {
    id: 'CRM-003',
    company_name: 'Rotterdam Maritime Trading N.V.',
    country: 'Netherlands',
    contact_person: 'Anouk de Jong',
    email: 'a.dejong@rotterdamtrade.nl',
    phone: '+31 10 442 8870',
    category: 'Logistics Partner',
    payment_terms: 'DDP Antwerp',
    status: 'Active',
    created_at: '2026-08-20T14:15:00Z',
  },
];

const DEFAULT_TRADE_LCS = [
  {
    id: 'LC-2026-8810',
    lc_number: 'LC-2026-8810',
    issuing_bank: 'HSBC London / Warsaw Desk',
    beneficiary: 'Warsaw Global Logistics Sp. z o.o.',
    applicant: 'Ferex Global Trade Corp',
    amount: 14500000,
    currency: 'INR',
    issue_date: '2026-08-25',
    expiry_date: '2026-10-30',
    status: 'Active & Confirmed',
    created_at: '2026-08-25T10:00:00Z',
  },
  {
    id: 'LC-2026-8811',
    lc_number: 'LC-2026-8811',
    issuing_bank: 'Deutsche Bank Frankfurt Desk',
    beneficiary: 'Berlin Industrial Supplies GmbH',
    applicant: 'Ferex Global Trade Corp',
    amount: 21000000,
    currency: 'INR',
    issue_date: '2026-08-28',
    expiry_date: '2026-11-15',
    status: 'Under Banking Verification',
    created_at: '2026-08-28T10:00:00Z',
  },
];

const DEFAULT_TRADE_BLS = [
  {
    id: 'BL-992014',
    bl_number: 'BL-992014',
    vessel_name: 'MSC Oscar (V.8821)',
    carrier: 'MSC Mediterranean Shipping Co.',
    port_of_loading: 'Port of Gdansk 🇵🇱',
    port_of_discharge: 'Port of Rotterdam 🇳🇱',
    shipper: 'Ferex Global Trade Corp',
    consignee: 'Warsaw Global Logistics Sp. z o.o.',
    issue_date: '2026-09-02',
    status: 'Clean On-Board Signed',
    created_at: '2026-09-02T10:00:00Z',
  },
];

const DEFAULT_TRADE_PLS = [
  {
    id: 'PL-2026-401',
    pl_number: 'PL-2026-401',
    shipment_no: 'SHP-9821',
    buyer_name: 'Berlin Industrial Supplies GmbH',
    cargo_description: 'High-Precision Industrial Bearing Assemblies (48 Crates)',
    total_packages: 48,
    gross_weight_kg: 24500,
    net_weight_kg: 22800,
    container_status: 'Loaded & Sealed (Customs Inspected)',
    created_at: '2026-09-02T10:00:00Z',
  },
];

const DEFAULT_TRADE_CERTS = [
  {
    id: 'CRT-2026-901',
    certificate_no: 'CRT-2026-901',
    title: 'EU Certificate of Origin (Form A)',
    authority: 'Chamber of Commerce Warsaw',
    country: 'Poland 🇵🇱',
    issue_date: '2026-07-10',
    expiry_date: '2027-07-10',
    status: 'Verified & Active',
    created_at: '2026-07-10T10:00:00Z',
  },
  {
    id: 'CRT-2026-902',
    certificate_no: 'CRT-2026-902',
    title: 'Phytosanitary Export Inspection Certificate',
    authority: 'Federal Ministry of Agriculture Berlin',
    country: 'Germany 🇩🇪',
    issue_date: '2026-01-22',
    expiry_date: '2027-01-22',
    status: 'Verified & Active',
    created_at: '2026-01-22T10:00:00Z',
  },
];

const DEFAULT_TRADE_PAYMENTS = [
  {
    id: 'TX-TRD-9001',
    transaction_ref: 'TX-TRD-9001',
    partner_entity: 'Warsaw Global Logistics Sp. z o.o.',
    description: 'Port Clearance & Customs Fee',
    amount: 1820000,
    currency: 'INR',
    payment_type: 'SWIFT Wire Transfer',
    status: 'Completed',
    settlement_date: '2026-08-28',
    created_at: '2026-08-28T10:00:00Z',
  },
  {
    id: 'TX-TRD-9002',
    transaction_ref: 'TX-TRD-9002',
    partner_entity: 'Berlin Industrial Supplies GmbH',
    description: 'Machinery Export Batch #4',
    amount: 4250000,
    currency: 'INR',
    payment_type: 'LC Settlement',
    status: 'Completed',
    settlement_date: '2026-09-01',
    created_at: '2026-09-01T10:00:00Z',
  },
];

// ─── 1. TRADE SHIPMENTS ───────────────────────────────────────────────────────
export async function getTradeShipments() {
  const seeded = isSeeded('shipments');
  const local = localStorage.getItem('ferex_trade_shipments');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('shipments');
    localList = DEFAULT_TRADE_SHIPMENTS;
    try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeShipment(shipment: {
  container_no: string;
  carrier?: string;
  origin_port?: string;
  destination_port?: string;
  cargo_description: string;
  cargo_weight_kg?: number;
  transport_mode?: string;
  eta?: string;
  etd?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    shipment_no: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
    container_no: shipment.container_no,
    carrier: shipment.carrier || 'Maersk Line',
    carrier_vessel: 'MSC Oscar (V.8821)',
    origin_port: shipment.origin_port || 'Port of Gdansk, Poland',
    destination_port: shipment.destination_port || 'Port of Rotterdam, Netherlands',
    cargo_description: shipment.cargo_description,
    commodity: shipment.cargo_description,
    cargo_weight_kg: shipment.cargo_weight_kg || 20000,
    container_count: 1,
    transport_mode: shipment.transport_mode || 'Maritime',
    incoterm: 'FOB',
    shipment_status: shipment.status || 'In Transit',
    status: shipment.status || 'In Transit',
    eta: shipment.eta || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    etd: shipment.etd || new Date().toISOString().split('T')[0],
    cargo_value: 4500000,
    currency: 'INR',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeShipments();
  const updated = [payload, ...current.filter((s: any) => s.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_shipments').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return payload;
}

export async function updateTradeShipmentStatus(id: string, status: string) {
  const current = await getTradeShipments();
  const updated = current.map((s: any) => (s.id === id || s.shipment_no === id) ? { ...s, status, shipment_status: status, updated_at: new Date().toISOString() } : s);
  try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_shipments')
      .update({ status, shipment_status: status, updated_at: new Date().toISOString() })
      .or(`id.eq.${id},shipment_no.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return { id, status };
}

export async function deleteTradeShipment(id: string) {
  const current = await getTradeShipments();
  const filtered = current.filter((s: any) => s.id !== id && s.shipment_no !== id);
  try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_shipments').delete().or(`id.eq.${id},shipment_no.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return true;
}

// ─── 2. TRADE INVOICES ────────────────────────────────────────────────────────
export async function getTradeInvoices() {
  const seeded = isSeeded('invoices');
  const local = localStorage.getItem('ferex_trade_invoices');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('invoices');
    localList = DEFAULT_TRADE_INVOICES;
    try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeInvoice(inv: {
  buyer_name: string;
  incoterms?: string;
  amount: number;
  currency?: string;
  payment_terms?: string;
  due_date?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    invoice_no: `INV-TRD-${Math.floor(10000 + Math.random() * 90000)}`,
    buyer_name: inv.buyer_name,
    incoterms: inv.incoterms || 'FOB',
    amount: inv.amount,
    currency: inv.currency || 'INR',
    status: inv.status || 'Issued',
    payment_status: inv.status || 'Issued',
    payment_terms: inv.payment_terms || 'Letter of Credit (LC) at Sight',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: inv.due_date || new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const current = await getTradeInvoices();
  const updated = [payload, ...current.filter((i: any) => i.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_invoices').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return payload;
}

export async function updateTradeInvoiceStatus(id: string, status: string) {
  const current = await getTradeInvoices();
  const updated = current.map((i: any) => (i.id === id || i.invoice_no === id) ? { ...i, status, payment_status: status, paid_at: status === 'Paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() } : i);
  try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_invoices')
      .update({ status, payment_status: status, paid_at: status === 'Paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .or(`id.eq.${id},invoice_no.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return { id, status };
}

export async function deleteTradeInvoice(id: string) {
  const current = await getTradeInvoices();
  const filtered = current.filter((i: any) => i.id !== id && i.invoice_no !== id);
  try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_invoices').delete().or(`id.eq.${id},invoice_no.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return true;
}

// ─── 3. TRADE CRM CLIENTS ────────────────────────────────────────────────────
export async function getTradeCRMContacts() {
  const seeded = isSeeded('crm_contacts');
  const local = localStorage.getItem('ferex_trade_crm');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('crm_contacts');
    localList = DEFAULT_TRADE_CRM_CONTACTS;
    try { localStorage.setItem('ferex_trade_crm', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_crm', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeCRMContact(c: {
  company_name: string;
  country: string;
  contact_person: string;
  email: string;
  phone?: string;
  category?: string;
  payment_terms?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    company_name: c.company_name,
    country: c.country,
    contact_person: c.contact_person,
    email: c.email,
    phone: c.phone || '+48 22 890 1234',
    category: c.category || 'Buyer',
    payment_terms: c.payment_terms || 'LC 60 Days',
    status: c.status || 'Active',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeCRMContacts();
  const updated = [payload, ...current.filter((contact: any) => contact.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_clients').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return payload;
}

export async function updateTradeCRMContact(id: string, updates: Partial<{
  company_name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  category: string;
  payment_terms: string;
  status: string;
}>) {
  const current = await getTradeCRMContacts();
  const updated = current.map((c: any) => (c.id === id || c.rawId === id) ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return { id, ...updates };
}

export async function deleteTradeCRMContact(id: string) {
  const current = await getTradeCRMContacts();
  const filtered = current.filter((c: any) => c.id !== id && c.rawId !== id);
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_clients').delete().eq('id', id); } catch {}
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return true;
}

// ─── 4. TRADE LETTERS OF CREDIT ──────────────────────────────────────────────
export async function getTradeLettersOfCredit() {
  const seeded = isSeeded('lcs');
  const local = localStorage.getItem('ferex_trade_lcs');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('lcs');
    localList = DEFAULT_TRADE_LCS;
    try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_letters_of_credit')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeLetterOfCredit(lc: {
  lc_number?: string;
  issuing_bank: string;
  beneficiary: string;
  amount: number;
  currency?: string;
  expiry_date?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    lc_number: lc.lc_number || `LC-2026-${Math.floor(8820 + Math.random() * 90)}`,
    issuing_bank: lc.issuing_bank,
    beneficiary: lc.beneficiary,
    applicant: 'Ferex Global Trade Corp',
    amount: lc.amount,
    currency: lc.currency || 'INR',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: lc.expiry_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    status: lc.status || 'Active & Confirmed',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeLettersOfCredit();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_letters_of_credit').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return payload;
}

export async function updateTradeLetterOfCreditStatus(id: string, status: string) {
  const current = await getTradeLettersOfCredit();
  const updated = current.map((item: any) => (item.id === id || item.lc_number === id) ? { ...item, status, updated_at: new Date().toISOString() } : item);
  try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_letters_of_credit')
      .update({ status })
      .or(`id.eq.${id},lc_number.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return { id, status };
}

export async function deleteTradeLetterOfCredit(id: string) {
  const current = await getTradeLettersOfCredit();
  const filtered = current.filter((item: any) => item.id !== id && item.lc_number !== id);
  try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_letters_of_credit').delete().or(`id.eq.${id},lc_number.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return true;
}

// ─── 5. TRADE BILLS OF LADING ────────────────────────────────────────────────
export async function getTradeBillsOfLading() {
  const seeded = isSeeded('bls');
  const local = localStorage.getItem('ferex_trade_bls');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('bls');
    localList = DEFAULT_TRADE_BLS;
    try { localStorage.setItem('ferex_trade_bls', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_bls', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeBillOfLading(bl: {
  bl_number?: string;
  vessel_name?: string;
  carrier?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  shipper?: string;
  consignee?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    bl_number: bl.bl_number || `BL-${Math.floor(100000 + Math.random() * 900000)}`,
    vessel_name: bl.vessel_name || 'MSC Oscar (V.8821)',
    carrier: bl.carrier || 'MSC Mediterranean Shipping Co.',
    port_of_loading: bl.port_of_loading || 'Port of Gdansk 🇵🇱',
    port_of_discharge: bl.port_of_discharge || 'Port of Rotterdam 🇳🇱',
    shipper: bl.shipper || 'Ferex Global Trade Corp',
    consignee: bl.consignee || 'Warsaw Global Logistics Sp. z o.o.',
    issue_date: new Date().toISOString().split('T')[0],
    status: bl.status || 'Clean On-Board Signed',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeBillsOfLading();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_bls', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_bills_of_lading').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return payload;
}

export async function updateTradeBillOfLadingStatus(id: string, status: string) {
  const current = await getTradeBillsOfLading();
  const updated = current.map((item: any) => (item.id === id || item.bl_number === id) ? { ...item, status, updated_at: new Date().toISOString() } : item);
  try { localStorage.setItem('ferex_trade_bls', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_bills_of_lading')
      .update({ status })
      .or(`id.eq.${id},bl_number.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return { id, status };
}

export async function deleteTradeBillOfLading(id: string) {
  const current = await getTradeBillsOfLading();
  const filtered = current.filter((item: any) => item.id !== id && item.bl_number !== id);
  try { localStorage.setItem('ferex_trade_bls', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_bills_of_lading').delete().or(`id.eq.${id},bl_number.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return true;
}

// ─── 6. TRADE PACKING LISTS ──────────────────────────────────────────────────
export async function getTradePackingLists() {
  const seeded = isSeeded('pls');
  const local = localStorage.getItem('ferex_trade_pls');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('pls');
    localList = DEFAULT_TRADE_PLS;
    try { localStorage.setItem('ferex_trade_pls', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_packing_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_pls', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradePackingList(pl: {
  pl_number?: string;
  shipment_no?: string;
  buyer_name?: string;
  total_packages?: number;
  gross_weight_kg?: number;
  net_weight_kg?: number;
  cargo_description?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    pl_number: pl.pl_number || `PL-2026-${Math.floor(100 + Math.random() * 900)}`,
    shipment_no: pl.shipment_no || `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
    buyer_name: pl.buyer_name || 'Berlin Industrial Supplies GmbH',
    total_packages: pl.total_packages || 48,
    gross_weight_kg: pl.gross_weight_kg || 24500,
    net_weight_kg: pl.net_weight_kg || 22800,
    cargo_description: pl.cargo_description || 'High-Precision Industrial Bearing Assemblies',
    container_status: 'Loaded & Sealed (Customs Inspected)',
    created_at: new Date().toISOString(),
  };

  const current = await getTradePackingLists();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_pls', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_packing_lists').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_pls_change'));
  return payload;
}

export async function deleteTradePackingList(id: string) {
  const current = await getTradePackingLists();
  const filtered = current.filter((item: any) => item.id !== id && item.pl_number !== id);
  try { localStorage.setItem('ferex_trade_pls', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_packing_lists').delete().or(`id.eq.${id},pl_number.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_pls_change'));
  return true;
}

// ─── 7. TRADE CERTIFICATES ───────────────────────────────────────────────────
export async function getTradeCertificates() {
  const seeded = isSeeded('certs');
  const local = localStorage.getItem('ferex_trade_certs');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('certs');
    localList = DEFAULT_TRADE_CERTS;
    try { localStorage.setItem('ferex_trade_certs', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_certs', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradeCertificate(cert: {
  certificate_no?: string;
  title: string;
  authority: string;
  country?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    certificate_no: cert.certificate_no || `CRT-2026-${Math.floor(900 + Math.random() * 90)}`,
    title: cert.title,
    authority: cert.authority,
    country: cert.country || 'Poland 🇵🇱',
    issue_date: cert.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: cert.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: cert.status || 'Verified & Active',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeCertificates();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_certs', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_certificates').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return payload;
}

export async function updateTradeCertificateStatus(id: string, status: string) {
  const current = await getTradeCertificates();
  const updated = current.map((item: any) => (item.id === id || item.certificate_no === id) ? { ...item, status, updated_at: new Date().toISOString() } : item);
  try { localStorage.setItem('ferex_trade_certs', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_certificates')
      .update({ status })
      .or(`id.eq.${id},certificate_no.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return { id, status };
}

export async function deleteTradeCertificate(id: string) {
  const current = await getTradeCertificates();
  const filtered = current.filter((item: any) => item.id !== id && item.certificate_no !== id);
  try { localStorage.setItem('ferex_trade_certs', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_certificates').delete().or(`id.eq.${id},certificate_no.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return true;
}

// ─── 8. TRADE PAYMENTS & LEDGER ──────────────────────────────────────────────
export async function getTradePayments() {
  const seeded = isSeeded('payments');
  const local = localStorage.getItem('ferex_trade_payments');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('payments');
    localList = DEFAULT_TRADE_PAYMENTS;
    try { localStorage.setItem('ferex_trade_payments', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_trade_payments', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createTradePayment(pay: {
  transaction_ref?: string;
  partner_entity: string;
  description: string;
  amount: number;
  currency?: string;
  payment_type?: string;
  status?: string;
  settlement_date?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    transaction_ref: pay.transaction_ref || `TX-TRD-${Math.floor(9000 + Math.random() * 900)}`,
    partner_entity: pay.partner_entity,
    description: pay.description,
    amount: pay.amount,
    currency: pay.currency || 'INR',
    payment_type: pay.payment_type || 'SWIFT Wire Transfer',
    status: pay.status || 'Completed',
    settlement_date: pay.settlement_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const current = await getTradePayments();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_payments', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_payments').insert(payload); } catch {}
  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return payload;
}

export async function updateTradePaymentStatus(id: string, status: string) {
  const current = await getTradePayments();
  const updated = current.map((item: any) => (item.id === id || item.transaction_ref === id) ? { ...item, status, updated_at: new Date().toISOString() } : item);
  try { localStorage.setItem('ferex_trade_payments', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_payments')
      .update({ status })
      .or(`id.eq.${id},transaction_ref.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return { id, status };
}

export async function deleteTradePayment(id: string) {
  const current = await getTradePayments();
  const filtered = current.filter((item: any) => item.id !== id && item.transaction_ref !== id);
  try { localStorage.setItem('ferex_trade_payments', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_payments').delete().or(`id.eq.${id},transaction_ref.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return true;
}

// ─── 9. TRADE DOCUMENTS ──────────────────────────────────────────────────────
export async function getTradeDocuments() {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_docs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_docs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_docs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
}

export async function uploadTradeDocumentRecord(doc: {
  document_name: string;
  folder?: string;
  file_size?: string;
  doc_type?: string;
  document_url?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    document_name: doc.document_name,
    folder: doc.folder || 'Customs Clearance',
    file_size: doc.file_size || '1.5 MB',
    doc_type: doc.doc_type || 'Customs Declaration',
    document_url: doc.document_url || 'https://placehold.co/600x400.png?text=Trade+Document',
    is_verified: true,
    uploaded_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('trade_documents').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_docs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeDocuments();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_docs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_docs_change'));
  return payload;
}

export async function deleteTradeDocumentRecord(id: string) {
  try {
    await supabase.from('trade_documents').delete().eq('id', id);
  } catch (e) {}

  try {
    const existing = await getTradeDocuments();
    const filtered = existing.filter((d: any) => d.id !== id);
    localStorage.setItem('ferex_trade_docs', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_docs_change'));
  return true;
}

// ─── 10. TRADE MESSAGES ──────────────────────────────────────────────────────
export async function getTradeMessages(conversationId: string = '1') {
  try {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      try { localStorage.setItem(`ferex_trade_msgs_${conversationId}`, JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem(`ferex_trade_msgs_${conversationId}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem(`ferex_trade_msgs_${conversationId}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
}

export async function sendTradeMessage(msg: {
  conversation_id: string;
  contact_name: string;
  contact_role?: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    conversation_id: msg.conversation_id,
    contact_name: msg.contact_name,
    contact_role: msg.contact_role || 'Customs Officer',
    sender_name: msg.sender_name || 'Trade Director',
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('trade_messages').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_msgs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeMessages(msg.conversation_id);
    const updated = [...existing, payload];
    localStorage.setItem(`ferex_trade_msgs_${msg.conversation_id}`, JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_msgs_change'));
  return payload;
}

// ─── 11. TRADE NOTIFICATIONS ─────────────────────────────────────────────────
export async function getTradeNotifications() {
  try {
    const { data, error } = await supabase
      .from('trade_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_notifs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_notifs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_notifs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
}

export async function createTradeNotification(notif: {
  title: string;
  description: string;
  category?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    title: notif.title,
    description: notif.description,
    category: notif.category || 'Logistics',
    is_read: false,
    is_archived: false,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('trade_notifications').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_notifs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeNotifications();
    const updated = [payload, ...existing];
    localStorage.setItem('ferex_trade_notifs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_notifs_change'));
  return payload;
}

export async function markTradeNotificationRead(id: string) {
  try {
    await supabase.from('trade_notifications').update({ is_read: true }).eq('id', id);
  } catch (e) {}

  try {
    const existing = await getTradeNotifications();
    const updated = existing.map((n: any) => n.id === id ? { ...n, is_read: true, read: true } : n);
    localStorage.setItem('ferex_trade_notifs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_notifs_change'));
  return true;
}

export async function archiveTradeNotification(id: string) {
  try {
    await supabase.from('trade_notifications').update({ is_archived: true }).eq('id', id);
  } catch (e) {}

  try {
    const existing = await getTradeNotifications();
    const updated = existing.map((n: any) => n.id === id ? { ...n, is_archived: true, archived: true } : n);
    localStorage.setItem('ferex_trade_notifs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_notifs_change'));
  return true;
}

// ─── 12. DYNAMIC LIVE TRADE DASHBOARD STATS ──────────────────────────────────
export async function getTradeDashboardLiveStats() {
  try {
    const [shipments, invoices, lcs, payments] = await Promise.all([
      getTradeShipments(),
      getTradeInvoices(),
      getTradeLettersOfCredit(),
      getTradePayments(),
    ]);

    const activeShipments = shipments.filter((s: any) => s.status === 'In Transit' || s.status === 'Loaded on Vessel' || s.shipment_status === 'In Transit');
    const totalVolume = invoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const openLCsAmount = lcs.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
    const clearedPaymentsAmount = payments.filter((p: any) => p.status === 'Completed').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const formatCr = (amt: number) => {
      if (!amt || amt === 0) return '₹0';
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeContainersCount: activeShipments.length,
      totalVolumeStr: formatCr(totalVolume),
      openLCsStr: formatCr(openLCsAmount),
      clearedPaymentsStr: formatCr(clearedPaymentsAmount),
      activeShipments,
      recentInvoices: invoices.slice(0, 5),
    };
  } catch {
    return {
      activeContainersCount: 0,
      totalVolumeStr: '₹0',
      openLCsStr: '₹0',
      clearedPaymentsStr: '₹0',
      activeShipments: [],
      recentInvoices: [],
    };
  }
}

// ─── Trade Partner Credential Provisioning ──────────────────────────────────
export interface ProvisionedTradeCredential {
  email: string;
  tempPassword: string;
  role: string;
  fullName: string;
  companyName: string;
  partnerId: string;
  requirePasswordReset: boolean;
  provisionedAt: string;
}

export async function provisionTradeClientLogin(partner: {
  id: string;
  email: string;
  company_name: string;
  contact_person?: string;
}): Promise<ProvisionedTradeCredential> {
  const cleanEmail = partner.email.trim().toLowerCase();
  const tempPassword = `TradePass#${Math.floor(1000 + Math.random() * 9000)}`;
  const companyName = partner.company_name || 'Global Trade Partner';
  const fullName = partner.contact_person || partner.company_name || 'Trade Representative';

  const credentialPayload: ProvisionedTradeCredential = {
    email: cleanEmail,
    tempPassword,
    role: 'trade_client',
    fullName,
    companyName,
    partnerId: partner.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  // 1. Save to local storage for persistent lookup
  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'trade_client',
    full_name: fullName,
    company_name: companyName,
    partner_id: partner.id,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_trade_partner_cred_${partner.id}`, JSON.stringify(credentialPayload));

  // 2. Persist to Supabase users table if available
  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'trade_client',
      full_name: fullName,
      phone: '',
      department: `Trade:${companyName}`,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch {}

  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return credentialPayload;
}

export function getTradeClientCredentials(partnerId: string): ProvisionedTradeCredential | null {
  const saved = localStorage.getItem(`ferex_trade_partner_cred_${partnerId}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// ─── 13. CUSTOMS BONDED WAREHOUSE & PORT YARD INVENTORY ──────────────────────
export interface BondedCargoItem {
  id: string;
  sku: string;
  commodity: string;
  category: string;
  port_location: string;
  warehouse_bay: string;
  in_stock_metric_tons: number;
  reserved_metric_tons: number;
  available_metric_tons: number;
  unit_value_inr: number;
  total_valuation_inr: number;
  customs_bond_no: string;
  status: 'In Bond' | 'Cleared Customs' | 'In Transit Transfer' | 'Under Inspection';
  last_inspected_at: string;
  updated_at: string;
}

export async function getTradeBondedInventory(): Promise<BondedCargoItem[]> {
  const seeded = isSeeded('bonded_inventory');
  const saved = localStorage.getItem('ferex_trade_bonded_inventory');
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  if (seeded) return [];
  markSeeded('bonded_inventory');
  const defaultItems: BondedCargoItem[] = [
    {
      id: 'BOND-01',
      sku: 'POL-COAL-6000',
      commodity: 'Premium Polish Thermal Coal (6000 kcal/kg)',
      category: 'Bulk Energy Commodities',
      port_location: 'Port of Gdansk, Bonded Bay #4A',
      warehouse_bay: 'Bay-04 North Terminal',
      in_stock_metric_tons: 45000,
      reserved_metric_tons: 12000,
      available_metric_tons: 33000,
      unit_value_inr: 11500,
      total_valuation_inr: 517500000,
      customs_bond_no: 'PL-GDN-CB-2026-0981',
      status: 'In Bond',
      last_inspected_at: '2026-09-02',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'BOND-02',
      sku: 'ROT-STEEL-HRC',
      commodity: 'Hot Rolled Steel Coils (Grade EN 10025)',
      category: 'Industrial Metals',
      port_location: 'Port of Rotterdam, Yard Pier 3',
      warehouse_bay: 'Shed 12 Heavy Stacking',
      in_stock_metric_tons: 18500,
      reserved_metric_tons: 5000,
      available_metric_tons: 13500,
      unit_value_inr: 62000,
      total_valuation_inr: 1147000000,
      customs_bond_no: 'NL-ROT-CB-2026-1140',
      status: 'In Bond',
      last_inspected_at: '2026-09-03',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'BOND-03',
      sku: 'JNPT-PETRO-BIT',
      commodity: 'Refined Bitumen & Industrial Petrochemicals',
      category: 'Chemicals & Energy',
      port_location: 'JNPT Mumbai, Bulk Tank Yard #2',
      warehouse_bay: 'Tank Cluster 02-B',
      in_stock_metric_tons: 8200,
      reserved_metric_tons: 2200,
      available_metric_tons: 6000,
      unit_value_inr: 48000,
      total_valuation_inr: 393600000,
      customs_bond_no: 'IN-JNPT-CB-2026-4412',
      status: 'Cleared Customs',
      last_inspected_at: '2026-09-01',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'BOND-04',
      sku: 'DXB-ALUM-ING',
      commodity: 'Primary Aluminium Ingots (99.7% P1020A)',
      category: 'Non-Ferrous Metals',
      port_location: 'Jebel Ali Port, Dubai FTZ #7',
      warehouse_bay: 'FTZ Bay 7-E',
      in_stock_metric_tons: 6400,
      reserved_metric_tons: 1400,
      available_metric_tons: 5000,
      unit_value_inr: 215000,
      total_valuation_inr: 1376000000,
      customs_bond_no: 'AE-DXB-FTZ-2026-8819',
      status: 'In Bond',
      last_inspected_at: '2026-08-30',
      updated_at: new Date().toISOString(),
    }
  ];
  try { localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(defaultItems)); } catch {}
  return defaultItems;
}

export async function createTradeBondedItem(item: Partial<BondedCargoItem>): Promise<BondedCargoItem> {
  const current = await getTradeBondedInventory();
  const inStock = Number(item.in_stock_metric_tons) || 1000;
  const reserved = Number(item.reserved_metric_tons) || 0;
  const unitVal = Number(item.unit_value_inr) || 15000;
  const created: BondedCargoItem = {
    id: `BOND-${Math.floor(10 + Math.random() * 90)}`,
    sku: item.sku || `SKU-TRD-${Math.floor(1000 + Math.random() * 9000)}`,
    commodity: item.commodity || 'Industrial Bulk Commodity',
    category: item.category || 'General Cargo',
    port_location: item.port_location || 'Port of Gdansk, Poland',
    warehouse_bay: item.warehouse_bay || 'Bay 01-East',
    in_stock_metric_tons: inStock,
    reserved_metric_tons: reserved,
    available_metric_tons: Math.max(0, inStock - reserved),
    unit_value_inr: unitVal,
    total_valuation_inr: inStock * unitVal,
    customs_bond_no: item.customs_bond_no || `BOND-${Math.floor(100000 + Math.random() * 900000)}`,
    status: item.status || 'In Bond',
    last_inspected_at: item.last_inspected_at || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return created;
}

export async function updateTradeBondedStock(id: string, updates: Partial<BondedCargoItem>) {
  const current = await getTradeBondedInventory();
  const updated = current.map(item => {
    if (item.id === id) {
      const inStock = updates.in_stock_metric_tons !== undefined ? Number(updates.in_stock_metric_tons) : item.in_stock_metric_tons;
      const reserved = updates.reserved_metric_tons !== undefined ? Number(updates.reserved_metric_tons) : item.reserved_metric_tons;
      const unitVal = updates.unit_value_inr !== undefined ? Number(updates.unit_value_inr) : item.unit_value_inr;
      return {
        ...item,
        ...updates,
        in_stock_metric_tons: inStock,
        reserved_metric_tons: reserved,
        available_metric_tons: Math.max(0, inStock - reserved),
        unit_value_inr: unitVal,
        total_valuation_inr: inStock * unitVal,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return true;
}

export async function deleteTradeBondedItem(id: string) {
  const current = await getTradeBondedInventory();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return true;
}

// ─── 14. DEMURRAGE, CARGO LOSS & DAMAGE / SHRINKAGE ENGINE ──────────────────
export interface CargoLossRecord {
  id: string;
  shipment_no: string;
  container_no: string;
  loss_type: 'Port Demurrage Penalty' | 'Transit Shrinkage' | 'Handling Damage' | 'Contamination / Spillage' | 'Customs Detention';
  port_location: string;
  loss_amount_inr: number;
  shrinkage_metric_tons?: number;
  carrier_responsible?: string;
  insurance_claim_status: 'Not Filed' | 'Claim Lodged' | 'Under Review' | 'Recovered / Reimbursed';
  incident_date: string;
  description: string;
}

export async function getTradeCargoLosses(): Promise<CargoLossRecord[]> {
  const seeded = isSeeded('cargo_losses');
  const saved = localStorage.getItem('ferex_trade_cargo_losses');
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  if (seeded) return [];
  markSeeded('cargo_losses');
  const defaultLosses: CargoLossRecord[] = [
    {
      id: 'LOSS-TRD-01',
      shipment_no: 'SHP-9021',
      container_no: 'MSCU-884920-1',
      loss_type: 'Port Demurrage Penalty',
      port_location: 'Port of Rotterdam (ECT Delta Terminal)',
      loss_amount_inr: 320000,
      carrier_responsible: 'Mediterranean Shipping Company',
      insurance_claim_status: 'Claim Lodged',
      incident_date: '2026-08-27',
      description: '4-day delay in customs bond clearance beyond free time allowance resulting in demurrage charges.'
    },
    {
      id: 'LOSS-TRD-02',
      shipment_no: 'SHP-8840',
      container_no: 'CMAU-440219-9',
      loss_type: 'Transit Shrinkage',
      port_location: 'Port of Gdansk, Poland',
      loss_amount_inr: 185000,
      shrinkage_metric_tons: 16.5,
      carrier_responsible: 'CMA CGM Logistics',
      insurance_claim_status: 'Recovered / Reimbursed',
      incident_date: '2026-08-19',
      description: 'Moisture loss and bulk handling cargo shrinkage during maritime transit from Gdansk to JNPT.'
    },
    {
      id: 'LOSS-TRD-03',
      shipment_no: 'SHP-7712',
      container_no: 'HLCU-902144-3',
      loss_type: 'Handling Damage',
      port_location: 'Jebel Ali Port Yard #3',
      loss_amount_inr: 450000,
      carrier_responsible: 'Hapag-Lloyd AG',
      insurance_claim_status: 'Under Review',
      incident_date: '2026-08-12',
      description: 'Crane spreader impact bent 2 coils during vessel discharge operations. Marine surveyor inspected.'
    }
  ];
  try { localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(defaultLosses)); } catch {}
  return defaultLosses;
}

export async function createTradeCargoLoss(record: Partial<CargoLossRecord>): Promise<CargoLossRecord> {
  const current = await getTradeCargoLosses();
  const created: CargoLossRecord = {
    id: `LOSS-TRD-${Math.floor(10 + Math.random() * 90)}`,
    shipment_no: record.shipment_no || 'SHP-8900',
    container_no: record.container_no || 'MSCU-000000-0',
    loss_type: record.loss_type || 'Port Demurrage Penalty',
    port_location: record.port_location || 'Port of Gdansk, Poland',
    loss_amount_inr: Number(record.loss_amount_inr) || 50000,
    shrinkage_metric_tons: record.shrinkage_metric_tons ? Number(record.shrinkage_metric_tons) : undefined,
    carrier_responsible: record.carrier_responsible || 'Maersk Line',
    insurance_claim_status: record.insurance_claim_status || 'Not Filed',
    incident_date: record.incident_date || new Date().toISOString().split('T')[0],
    description: record.description || 'Cargo loss incident recorded in maritime log.',
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_cargo_losses_change'));
  return created;
}

export async function deleteTradeCargoLoss(id: string) {
  const current = await getTradeCargoLosses();
  const updated = current.filter(l => l.id !== id);
  localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_trade_cargo_losses_change'));
  return true;
}

export async function getTradeCargoLossSummary() {
  const losses = await getTradeCargoLosses();
  const totalLossInr = losses.reduce((sum, l) => sum + (Number(l.loss_amount_inr) || 0), 0);
  const totalDemurrageInr = losses.filter(l => l.loss_type === 'Port Demurrage Penalty').reduce((sum, l) => sum + (Number(l.loss_amount_inr) || 0), 0);
  const totalShrinkageTons = losses.reduce((sum, l) => sum + (Number(l.shrinkage_metric_tons) || 0), 0);
  const recoveredInr = losses.filter(l => l.insurance_claim_status === 'Recovered / Reimbursed').reduce((sum, l) => sum + (Number(l.loss_amount_inr) || 0), 0);

  return {
    totalLossInr,
    totalDemurrageInr,
    totalShrinkageTons,
    recoveredInr,
    totalLossesCount: losses.length
  };
}


