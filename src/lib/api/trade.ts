import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Trade Shipments ────────────────────────────────────────────────────────
export async function getTradeShipments() {
  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[getTradeShipments Notice]:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
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
}) {
  const payload = {
    id: generateUUID(),
    shipment_no: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
    container_no: shipment.container_no,
    carrier: shipment.carrier || 'Maersk Line',
    origin_port: shipment.origin_port || 'Gdansk Port (Poland)',
    destination_port: shipment.destination_port || 'Rotterdam (Netherlands)',
    cargo_description: shipment.cargo_description,
    cargo_weight_kg: shipment.cargo_weight_kg || 22000,
    transport_mode: shipment.transport_mode || 'Maritime',
    status: 'In Transit',
    eta: shipment.eta || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    etd: shipment.etd || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('trade_shipments').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateTradeShipmentStatus(id: string, status: string) {
  const { data, error } = await supabase.from('trade_shipments').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

// ─── Trade Invoices ─────────────────────────────────────────────────────────
export async function getTradeInvoices() {
  try {
    const { data, error } = await supabase
      .from('trade_invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createTradeInvoice(inv: {
  buyer_name: string;
  incoterms?: string;
  amount: number;
  currency?: string;
  payment_terms?: string;
}) {
  const payload = {
    id: generateUUID(),
    invoice_no: `INV-TRD-${Math.floor(10000 + Math.random() * 90000)}`,
    buyer_name: inv.buyer_name,
    incoterms: inv.incoterms || 'FOB',
    amount: inv.amount,
    currency: inv.currency || 'EUR',
    status: 'Issued',
    payment_terms: inv.payment_terms || 'Letter of Credit (LC) at Sight',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('trade_invoices').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Trade CRM Contacts ─────────────────────────────────────────────────────
export async function getTradeCRMContacts() {
  try {
    const { data, error } = await supabase
      .from('trade_crm_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createTradeCRMContact(c: {
  company_name: string;
  country: string;
  contact_person: string;
  email: string;
  phone?: string;
  category?: string;
}) {
  const payload = {
    id: generateUUID(),
    company_name: c.company_name,
    country: c.country,
    contact_person: c.contact_person,
    email: c.email,
    phone: c.phone || '',
    category: c.category || 'Buyer',
    status: 'Active',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('trade_crm_contacts').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Trade Letters of Credit ────────────────────────────────────────────────
export async function getTradeLettersOfCredit() {
  try {
    const { data, error } = await supabase
      .from('trade_letters_of_credit')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createTradeLetterOfCredit(lc: {
  lc_number: string;
  issuing_bank: string;
  beneficiary: string;
  amount: number;
  currency?: string;
  expiry_date?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    lc_number: lc.lc_number,
    issuing_bank: lc.issuing_bank,
    beneficiary: lc.beneficiary,
    amount: lc.amount,
    currency: lc.currency || 'USD',
    expiry_date: lc.expiry_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    status: lc.status || 'Active & Confirmed',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('trade_letters_of_credit').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Trade Bills of Lading ──────────────────────────────────────────────────
export async function getTradeBillsOfLading() {
  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
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
  const payload = {
    id: generateUUID(),
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
  const { data, error } = await supabase.from('trade_bills_of_lading').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Trade Packing Lists ────────────────────────────────────────────────────
export async function getTradePackingLists() {
  try {
    const { data, error } = await supabase
      .from('trade_packing_lists')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
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
  const payload = {
    id: generateUUID(),
    pl_number: pl.pl_number || `PL-2026-${Math.floor(100 + Math.random() * 900)}`,
    shipment_no: pl.shipment_no || `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
    buyer_name: pl.buyer_name || 'Berlin Industrial Supplies GmbH',
    total_packages: pl.total_packages || 48,
    gross_weight_kg: pl.gross_weight_kg || 24500,
    net_weight_kg: pl.net_weight_kg || 22800,
    cargo_description: pl.cargo_description || 'High-Precision Industrial Bearing Assemblies',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('trade_packing_lists').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Trade Dashboard Stats ──────────────────────────────────────────────────
export async function getTradeDashboardStats() {
  try {
    const [shipmentsRes, invoicesRes, crmRes] = await Promise.all([
      supabase.from('trade_shipments').select('cargo_weight_kg, status'),
      supabase.from('trade_invoices').select('amount, status, currency'),
      supabase.from('trade_crm_contacts').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    ]);

    const activeShipments = (shipmentsRes.data ?? []).filter((s: any) => s.status === 'In Transit' || s.status === 'Loaded on Vessel');
    const totalTonnage = (shipmentsRes.data ?? []).reduce((sum: number, s: any) => sum + (Number(s.cargo_weight_kg) || 0), 0) / 1000;
    const paidRevenueEur = (invoicesRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const activePartners = crmRes.count ?? 0;

    return {
      activeShipmentsCount: activeShipments.length,
      totalTonnageTons: Math.round(totalTonnage),
      revenueEur: paidRevenueEur,
      activePartnersCount: activePartners,
    };
  } catch {
    return {
      activeShipmentsCount: 0,
      totalTonnageTons: 0,
      revenueEur: 0,
      activePartnersCount: 0,
    };
  }
}
