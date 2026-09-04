import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── 1. TRADE SHIPMENTS ───────────────────────────────────────────────────────
export async function getTradeShipments() {
  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_shipments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_shipments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
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

  try {
    const { data, error } = await supabase.from('trade_shipments').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_shipments_change'));
      return data[0];
    }
  } catch (e) {}

  // Local storage fallback
  try {
    const existing = await getTradeShipments();
    const updated = [payload, ...existing.filter((s: any) => s.id !== payload.id)];
    localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return payload;
}

export async function updateTradeShipmentStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .update({ status, shipment_status: status, updated_at: new Date().toISOString() })
      .or(`id.eq.${id},shipment_no.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_shipments_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeShipments();
    const updated = existing.map((s: any) => (s.id === id || s.shipment_no === id) ? { ...s, status, shipment_status: status } : s);
    localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return { id, status };
}

export async function deleteTradeShipment(id: string) {
  try {
    await supabase.from('trade_shipments').delete().or(`id.eq.${id},shipment_no.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradeShipments();
    const filtered = existing.filter((s: any) => s.id !== id && s.shipment_no !== id);
    localStorage.setItem('ferex_trade_shipments', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return true;
}

// ─── 2. TRADE INVOICES ────────────────────────────────────────────────────────
export async function getTradeInvoices() {
  try {
    const { data, error } = await supabase
      .from('trade_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_invoices');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_invoices');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
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

  try {
    const { data, error } = await supabase.from('trade_invoices').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_invoices_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeInvoices();
    const updated = [payload, ...existing.filter((i: any) => i.id !== payload.id)];
    localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return payload;
}

export async function updateTradeInvoiceStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_invoices')
      .update({ status, payment_status: status, paid_at: status === 'Paid' ? new Date().toISOString() : null })
      .or(`id.eq.${id},invoice_no.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_invoices_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeInvoices();
    const updated = existing.map((i: any) => (i.id === id || i.invoice_no === id) ? { ...i, status, payment_status: status } : i);
    localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return { id, status };
}

export async function deleteTradeInvoice(id: string) {
  try {
    await supabase.from('trade_invoices').delete().or(`id.eq.${id},invoice_no.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradeInvoices();
    const filtered = existing.filter((i: any) => i.id !== id && i.invoice_no !== id);
    localStorage.setItem('ferex_trade_invoices', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return true;
}

// ─── 3. TRADE CRM CLIENTS ────────────────────────────────────────────────────
export async function getTradeCRMContacts() {
  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_crm', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_crm');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_crm');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
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

  try {
    const { data, error } = await supabase.from('trade_clients').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_crm_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeCRMContacts();
    const updated = [payload, ...existing.filter((contact: any) => contact.id !== payload.id)];
    localStorage.setItem('ferex_trade_crm', JSON.stringify(updated));
  } catch (e) {}

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
  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_crm_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeCRMContacts();
    const updated = existing.map((c: any) => c.id === id ? { ...c, ...updates } : c);
    localStorage.setItem('ferex_trade_crm', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return { id, ...updates };
}

export async function deleteTradeCRMContact(id: string) {
  try {
    await supabase.from('trade_clients').delete().eq('id', id);
  } catch (e) {}

  try {
    const existing = await getTradeCRMContacts();
    const filtered = existing.filter((c: any) => c.id !== id);
    localStorage.setItem('ferex_trade_crm', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return true;
}

// ─── 4. TRADE LETTERS OF CREDIT ──────────────────────────────────────────────
export async function getTradeLettersOfCredit() {
  try {
    const { data, error } = await supabase
      .from('trade_letters_of_credit')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_lcs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_lcs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
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

  try {
    const { data, error } = await supabase.from('trade_letters_of_credit').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_lcs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeLettersOfCredit();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return payload;
}

export async function updateTradeLetterOfCreditStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_letters_of_credit')
      .update({ status })
      .or(`id.eq.${id},lc_number.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_lcs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeLettersOfCredit();
    const updated = existing.map((item: any) => (item.id === id || item.lc_number === id) ? { ...item, status } : item);
    localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return { id, status };
}

export async function deleteTradeLetterOfCredit(id: string) {
  try {
    await supabase.from('trade_letters_of_credit').delete().or(`id.eq.${id},lc_number.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradeLettersOfCredit();
    const filtered = existing.filter((item: any) => item.id !== id && item.lc_number !== id);
    localStorage.setItem('ferex_trade_lcs', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return true;
}

// ─── 5. TRADE BILLS OF LADING ────────────────────────────────────────────────
export async function getTradeBillsOfLading() {
  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_bls', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_bls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_bls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
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

  try {
    const { data, error } = await supabase.from('trade_bills_of_lading').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_bls_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeBillsOfLading();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_bls', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return payload;
}

export async function updateTradeBillOfLadingStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .update({ status })
      .or(`id.eq.${id},bl_number.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_bls_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeBillsOfLading();
    const updated = existing.map((item: any) => (item.id === id || item.bl_number === id) ? { ...item, status } : item);
    localStorage.setItem('ferex_trade_bls', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return { id, status };
}

export async function deleteTradeBillOfLading(id: string) {
  try {
    await supabase.from('trade_bills_of_lading').delete().or(`id.eq.${id},bl_number.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradeBillsOfLading();
    const filtered = existing.filter((item: any) => item.id !== id && item.bl_number !== id);
    localStorage.setItem('ferex_trade_bls', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return true;
}

// ─── 6. TRADE PACKING LISTS ──────────────────────────────────────────────────
export async function getTradePackingLists() {
  try {
    const { data, error } = await supabase
      .from('trade_packing_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_pls', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_pls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_pls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
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

  try {
    const { data, error } = await supabase.from('trade_packing_lists').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_pls_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradePackingLists();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_pls', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_pls_change'));
  return payload;
}

export async function deleteTradePackingList(id: string) {
  try {
    await supabase.from('trade_packing_lists').delete().or(`id.eq.${id},pl_number.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradePackingLists();
    const filtered = existing.filter((item: any) => item.id !== id && item.pl_number !== id);
    localStorage.setItem('ferex_trade_pls', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_pls_change'));
  return true;
}

// ─── 7. TRADE CERTIFICATES ───────────────────────────────────────────────────
export async function getTradeCertificates() {
  try {
    const { data, error } = await supabase
      .from('trade_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_certs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_certs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_certs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
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

  try {
    const { data, error } = await supabase.from('trade_certificates').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_certs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeCertificates();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_certs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return payload;
}

export async function updateTradeCertificateStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_certificates')
      .update({ status })
      .or(`id.eq.${id},certificate_no.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_certs_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradeCertificates();
    const updated = existing.map((item: any) => (item.id === id || item.certificate_no === id) ? { ...item, status } : item);
    localStorage.setItem('ferex_trade_certs', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return { id, status };
}

export async function deleteTradeCertificate(id: string) {
  try {
    await supabase.from('trade_certificates').delete().or(`id.eq.${id},certificate_no.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradeCertificates();
    const filtered = existing.filter((item: any) => item.id !== id && item.certificate_no !== id);
    localStorage.setItem('ferex_trade_certs', JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return true;
}

// ─── 8. TRADE PAYMENTS & LEDGER ──────────────────────────────────────────────
export async function getTradePayments() {
  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      try { localStorage.setItem('ferex_trade_payments', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_payments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_payments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [];
  }
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

  try {
    const { data, error } = await supabase.from('trade_payments').insert(payload).select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_payments_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradePayments();
    const updated = [payload, ...existing.filter((item: any) => item.id !== payload.id)];
    localStorage.setItem('ferex_trade_payments', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return payload;
}

export async function updateTradePaymentStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .update({ status })
      .or(`id.eq.${id},transaction_ref.eq.${id}`)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_payments_change'));
      return data[0];
    }
  } catch (e) {}

  try {
    const existing = await getTradePayments();
    const updated = existing.map((item: any) => (item.id === id || item.transaction_ref === id) ? { ...item, status } : item);
    localStorage.setItem('ferex_trade_payments', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return { id, status };
}

export async function deleteTradePayment(id: string) {
  try {
    await supabase.from('trade_payments').delete().or(`id.eq.${id},transaction_ref.eq.${id}`);
  } catch (e) {}

  try {
    const existing = await getTradePayments();
    const filtered = existing.filter((item: any) => item.id !== id && item.transaction_ref !== id);
    localStorage.setItem('ferex_trade_payments', JSON.stringify(filtered));
  } catch (e) {}

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
    role: 'trade',
    fullName,
    companyName,
    partnerId: partner.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  // 1. Save to local storage for persistent mock/fallback lookup
  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'trade',
    full_name: fullName,
    company_name: companyName,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_trade_partner_cred_${partner.id}`, JSON.stringify(credentialPayload));

  // 2. Persist to Supabase users table if available
  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'trade',
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

