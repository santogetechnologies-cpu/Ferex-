import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Default Baseline Seeds (Loaded if DB is fresh) ──────────────────────────
const BASELINE_SHIPMENTS = [
  {
    id: 'SHP-9821',
    shipment_no: 'SHP-9821',
    container_no: 'MSKU-9821045',
    carrier: 'Maersk Line',
    origin_port: 'Port of Gdansk, Poland',
    destination_port: 'Port of Rotterdam, Netherlands',
    cargo_description: 'Industrial Bearing Assemblies & Heavy Machinery',
    cargo_weight_kg: 24500,
    transport_mode: 'Maritime',
    status: 'In Transit',
    eta: '2026-09-18',
    etd: '2026-09-02',
    created_at: new Date().toISOString(),
  },
  {
    id: 'SHP-9822',
    shipment_no: 'SHP-9822',
    container_no: 'CMAU-4412093',
    carrier: 'CMA CGM Logistics',
    origin_port: 'Hamburg Port, Germany',
    destination_port: 'Port of Antwerp, Belgium',
    cargo_description: 'Precision Hydraulic Valves & Electronics',
    cargo_weight_kg: 18200,
    transport_mode: 'Maritime',
    status: 'Loaded on Vessel',
    eta: '2026-09-22',
    etd: '2026-09-04',
    created_at: new Date().toISOString(),
  },
  {
    id: 'SHP-9823',
    shipment_no: 'SHP-9823',
    container_no: 'HLCU-7729104',
    carrier: 'Hapag-Lloyd Ocean',
    origin_port: 'Gdynia Maritime Terminal, Poland',
    destination_port: 'Felixstowe Port, UK',
    cargo_description: 'Automotive Alloy Castings & Components',
    cargo_weight_kg: 28400,
    transport_mode: 'Maritime',
    status: 'In Transit',
    eta: '2026-09-26',
    etd: '2026-09-06',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_INVOICES = [
  {
    id: 'INV-TRD-40101',
    invoice_no: 'INV-TRD-40101',
    buyer_name: 'Berlin Industrial Supplies GmbH',
    incoterms: 'CIF Rotterdam',
    amount: 4250000,
    currency: 'INR',
    payment_terms: 'Letter of Credit (LC) at Sight',
    status: 'Paid',
    issue_date: '2026-08-28',
    due_date: '2026-09-28',
    created_at: new Date().toISOString(),
  },
  {
    id: 'INV-TRD-40102',
    invoice_no: 'INV-TRD-40102',
    buyer_name: 'Warsaw Global Logistics Sp. z o.o.',
    incoterms: 'FOB Gdansk',
    amount: 1820000,
    currency: 'INR',
    payment_terms: 'SWIFT Wire (Net 30)',
    status: 'Paid',
    issue_date: '2026-09-01',
    due_date: '2026-10-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'INV-TRD-40103',
    invoice_no: 'INV-TRD-40103',
    buyer_name: 'Rotterdam Maritime Trading N.V.',
    incoterms: 'DDP Antwerp',
    amount: 8500000,
    currency: 'INR',
    payment_terms: 'Irrevocable LC (60 Days)',
    status: 'Issued',
    issue_date: '2026-09-03',
    due_date: '2026-10-15',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_CRM = [
  {
    id: 'CRM-101',
    company_name: 'Warsaw Global Logistics Sp. z o.o.',
    country: 'Poland',
    contact_person: 'Jan Kowalski',
    email: 'j.kowalski@warsawlogistics.pl',
    phone: '+48 22 890 1234',
    category: 'Freight Forwarder',
    status: 'Active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'CRM-102',
    company_name: 'Berlin Industrial Supplies GmbH',
    country: 'Germany',
    contact_person: 'Hans Weber',
    email: 'h.weber@berlin-supplies.de',
    phone: '+49 30 554 9912',
    category: 'Buyer',
    status: 'Active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'CRM-103',
    company_name: 'Rotterdam Maritime Trading N.V.',
    country: 'Netherlands',
    contact_person: 'Anouk de Jong',
    email: 'a.dejong@rotterdamtrade.nl',
    phone: '+31 10 442 8870',
    category: 'Logistics Partner',
    status: 'Active',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_LCS = [
  {
    id: 'LC-2026-8810',
    lc_number: 'LC-2026-8810',
    issuing_bank: 'HSBC London / Warsaw Desk',
    beneficiary: 'Warsaw Global Logistics Sp. z o.o.',
    applicant: 'Ferex Global Trade Corp',
    amount: 14500000,
    currency: 'INR',
    issue_date: '2026-08-15',
    expiry_date: '2026-10-30',
    status: 'HSBC Cleared',
    created_at: new Date().toISOString(),
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
    created_at: new Date().toISOString(),
  }
];

const BASELINE_BLS = [
  {
    id: 'BL-992014',
    bl_number: 'BL-992014',
    vessel_name: 'MSC Oscar (V.8821)',
    carrier: 'MSC Mediterranean Shipping Co.',
    port_of_loading: 'Port of Gdansk 🇵🇱',
    port_of_discharge: 'Port of Rotterdam 🇳🇱',
    shipper: 'Ferex Global Trade Corp',
    consignee: 'Warsaw Global Logistics Sp. z o.o.',
    issue_date: '2026-08-28',
    status: 'Clean On-Board Signed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'BL-992015',
    bl_number: 'BL-992015',
    vessel_name: 'CMA CGM Champs Elysees',
    carrier: 'CMA CGM Ocean Line',
    port_of_loading: 'Hamburg Port 🇩🇪',
    port_of_discharge: 'Port of Antwerp 🇧🇪',
    shipper: 'Ferex Global Trade Corp',
    consignee: 'Berlin Industrial Supplies GmbH',
    issue_date: '2026-09-02',
    status: 'Issued & Stamped',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_PACKING_LISTS = [
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
    created_at: new Date().toISOString(),
  },
  {
    id: 'PL-2026-402',
    pl_number: 'PL-2026-402',
    shipment_no: 'SHP-9822',
    buyer_name: 'Warsaw Global Logistics Sp. z o.o.',
    cargo_description: 'Precision Hydraulic Valves & Control Modules (32 Crates)',
    total_packages: 32,
    gross_weight_kg: 18200,
    net_weight_kg: 16900,
    container_status: 'Port Yard Ready',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_CERTS = [
  {
    id: 'CRT-2026-901',
    certificate_no: 'CRT-2026-901',
    title: 'EU Certificate of Origin (Form A)',
    authority: 'Chamber of Commerce Warsaw',
    country: 'Poland 🇵🇱',
    issue_date: '2026-07-10',
    expiry_date: '2027-07-10',
    status: 'Verified & Active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'CRT-2026-902',
    certificate_no: 'CRT-2026-902',
    title: 'Phytosanitary Export Inspection Certificate',
    authority: 'Federal Ministry of Agriculture Berlin',
    country: 'Germany 🇩🇪',
    issue_date: '2026-07-22',
    expiry_date: '2027-01-22',
    status: 'Verified & Active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'CRT-2026-903',
    certificate_no: 'CRT-2026-903',
    title: 'ISO 9001:2025 International Quality Certificate',
    authority: 'TÜV Rheinland International',
    country: 'Germany 🇩🇪',
    issue_date: '2026-01-15',
    expiry_date: '2029-01-15',
    status: 'Audit Passed',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_PAYMENTS = [
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
    created_at: new Date().toISOString(),
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
    created_at: new Date().toISOString(),
  },
  {
    id: 'TX-TRD-9003',
    transaction_ref: 'TX-TRD-9003',
    partner_entity: 'Rotterdam Maritime Trading N.V.',
    description: 'Agri-Tech Container Deposit',
    amount: 8500000,
    currency: 'INR',
    payment_type: 'LC Settlement',
    status: 'Pending Settlement',
    settlement_date: '2026-09-04',
    created_at: new Date().toISOString(),
  }
];

const BASELINE_DOCUMENTS = [
  {
    id: 'DOC-101',
    document_name: 'Maersk_Bill_Of_Lading_BL992014.pdf',
    folder: 'Shipment Contracts',
    file_size: '2.4 MB',
    doc_type: 'Bill of Lading',
    document_url: 'https://placehold.co/600x400.png?text=Bill+of+Lading+PDF',
    is_verified: true,
    uploaded_at: '2026-08-28T10:00:00.000Z'
  },
  {
    id: 'DOC-102',
    document_name: 'Commercial_Invoice_INV40101_Germany.pdf',
    folder: 'Export Invoices',
    file_size: '1.1 MB',
    doc_type: 'Commercial Invoice',
    document_url: 'https://placehold.co/600x400.png?text=Commercial+Invoice+PDF',
    is_verified: true,
    uploaded_at: '2026-09-01T11:30:00.000Z'
  },
  {
    id: 'DOC-103',
    document_name: 'Phytosanitary_EU_Certificate_2026.pdf',
    folder: 'Customs Clearance',
    file_size: '3.8 MB',
    doc_type: 'Phytosanitary Cert',
    document_url: 'https://placehold.co/600x400.png?text=Phytosanitary+Cert+PDF',
    is_verified: true,
    uploaded_at: '2026-09-02T14:15:00.000Z'
  },
  {
    id: 'DOC-104',
    document_name: 'HSBC_Letter_Of_Credit_LC8810.pdf',
    folder: 'Letters of Credit',
    file_size: '1.9 MB',
    doc_type: 'Letter of Credit',
    document_url: 'https://placehold.co/600x400.png?text=Letter+of+Credit+PDF',
    is_verified: true,
    uploaded_at: '2026-09-03T09:00:00.000Z'
  }
];

const BASELINE_MESSAGES = [
  {
    id: 'msg-1',
    conversation_id: '1',
    contact_name: 'Jan Kowalski (Warsaw Logistics)',
    contact_role: 'Customs Officer',
    sender_name: 'Jan Kowalski',
    message: 'Good morning. Checking status on container MSKU-9821045.',
    is_self: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'msg-2',
    conversation_id: '1',
    contact_name: 'Jan Kowalski (Warsaw Logistics)',
    contact_role: 'Customs Officer',
    sender_name: 'Trade Director',
    message: 'Bills of Lading BL-992014 signed. Customs clearance submitted.',
    is_self: true,
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'msg-3',
    conversation_id: '1',
    contact_name: 'Jan Kowalski (Warsaw Logistics)',
    contact_role: 'Customs Officer',
    sender_name: 'Jan Kowalski',
    message: 'Container MSKU-9821 is gate-out cleared.',
    is_self: false,
    created_at: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'msg-4',
    conversation_id: '2',
    contact_name: 'Hans Weber (Berlin Supplies)',
    contact_role: 'Import Manager',
    sender_name: 'Hans Weber',
    message: 'LC copy approved by Deutsche Bank.',
    is_self: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'msg-5',
    conversation_id: '3',
    contact_name: 'Anouk de Jong (Rotterdam Trade)',
    contact_role: 'Export Director',
    sender_name: 'Anouk de Jong',
    message: 'Sending Phytosanitary cert PDF.',
    is_self: false,
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

const BASELINE_NOTIFICATIONS = [
  {
    id: 'NTF-101',
    title: 'Container MSKU-9821 Arrived at Port',
    description: 'Customs gate-out clearance confirmed at Port of Hamburg.',
    category: 'Logistics',
    is_read: false,
    is_archived: false,
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'NTF-102',
    title: 'LC-2026-8810 Approved by HSBC Bank',
    description: 'Irrevocable LC valued at ₹1.45 Cr authorized.',
    category: 'Banking',
    is_read: false,
    is_archived: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'NTF-103',
    title: 'Commercial Invoice INV-TRD-40101 Paid',
    description: 'Settlement of ₹42,50,000 received from Berlin Supplies.',
    category: 'Payments',
    is_read: true,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'NTF-104',
    title: 'EU Phytosanitary Certificate Issued',
    description: 'Batch #8812 clearance stamp added to vault.',
    category: 'Customs',
    is_read: true,
    is_archived: true,
    created_at: new Date(Date.now() - 259200000).toISOString()
  }
];

// ─── 1. TRADE SHIPMENTS ───────────────────────────────────────────────────────
export async function getTradeShipments() {
  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_shipments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_SHIPMENTS;
  } catch {
    const local = localStorage.getItem('ferex_trade_shipments');
    return local ? JSON.parse(local) : BASELINE_SHIPMENTS;
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
    shipment_status: 'In Transit',
    status: 'In Transit',
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

  // Local storage backup
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
      .eq('id', id)
      .select();
    if (!error && data && data.length > 0) {
      window.dispatchEvent(new Event('ferex_trade_shipments_change'));
      return data[0];
    }
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return { id, status };
}

export async function deleteTradeShipment(id: string) {
  try {
    await supabase.from('trade_shipments').delete().eq('id', id);
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

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_invoices');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_INVOICES;
  } catch {
    const local = localStorage.getItem('ferex_trade_invoices');
    return local ? JSON.parse(local) : BASELINE_INVOICES;
  }
}

export async function createTradeInvoice(inv: {
  buyer_name: string;
  incoterms?: string;
  amount: number;
  currency?: string;
  payment_terms?: string;
  due_date?: string;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    invoice_no: `INV-TRD-${Math.floor(10000 + Math.random() * 90000)}`,
    buyer_name: inv.buyer_name,
    incoterms: inv.incoterms || 'FOB',
    amount: inv.amount,
    currency: inv.currency || 'INR',
    status: 'Issued',
    payment_status: 'Issued',
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

// ─── 3. TRADE CRM CLIENTS ────────────────────────────────────────────────────
export async function getTradeCRMContacts() {
  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_crm', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_crm');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_CRM;
  } catch {
    const local = localStorage.getItem('ferex_trade_crm');
    return local ? JSON.parse(local) : BASELINE_CRM;
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
  const newId = generateUUID();
  const payload = {
    id: newId,
    company_name: c.company_name,
    country: c.country,
    contact_person: c.contact_person,
    email: c.email,
    phone: c.phone || '+48 22 890 1234',
    category: c.category || 'Buyer',
    payment_terms: 'LC 60 Days',
    status: 'Active',
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

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_lcs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_LCS;
  } catch {
    const local = localStorage.getItem('ferex_trade_lcs');
    return local ? JSON.parse(local) : BASELINE_LCS;
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

// ─── 5. TRADE BILLS OF LADING ────────────────────────────────────────────────
export async function getTradeBillsOfLading() {
  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_bls', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_bls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_BLS;
  } catch {
    const local = localStorage.getItem('ferex_trade_bls');
    return local ? JSON.parse(local) : BASELINE_BLS;
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

// ─── 6. TRADE PACKING LISTS ──────────────────────────────────────────────────
export async function getTradePackingLists() {
  try {
    const { data, error } = await supabase
      .from('trade_packing_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_pls', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_pls');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_PACKING_LISTS;
  } catch {
    const local = localStorage.getItem('ferex_trade_pls');
    return local ? JSON.parse(local) : BASELINE_PACKING_LISTS;
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

// ─── 7. TRADE CERTIFICATES ───────────────────────────────────────────────────
export async function getTradeCertificates() {
  try {
    const { data, error } = await supabase
      .from('trade_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_certs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_certs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_CERTS;
  } catch {
    const local = localStorage.getItem('ferex_trade_certs');
    return local ? JSON.parse(local) : BASELINE_CERTS;
  }
}

export async function createTradeCertificate(cert: {
  certificate_no?: string;
  title: string;
  authority: string;
  country?: string;
  issue_date?: string;
  expiry_date?: string;
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
    status: 'Verified & Active',
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

// ─── 8. TRADE PAYMENTS & LEDGER ──────────────────────────────────────────────
export async function getTradePayments() {
  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_payments', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_payments');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_PAYMENTS;
  } catch {
    const local = localStorage.getItem('ferex_trade_payments');
    return local ? JSON.parse(local) : BASELINE_PAYMENTS;
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
    settlement_date: new Date().toISOString().split('T')[0],
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

// ─── 9. TRADE DOCUMENTS ──────────────────────────────────────────────────────
export async function getTradeDocuments() {
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_docs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_docs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_DOCUMENTS;
  } catch {
    const local = localStorage.getItem('ferex_trade_docs');
    return local ? JSON.parse(local) : BASELINE_DOCUMENTS;
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

    if (!error && data && data.length > 0) {
      return data;
    }

    const local = localStorage.getItem(`ferex_trade_msgs_${conversationId}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_MESSAGES.filter(m => m.conversation_id === conversationId);
  } catch {
    return BASELINE_MESSAGES.filter(m => m.conversation_id === conversationId);
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

    if (!error && data && data.length > 0) {
      try { localStorage.setItem('ferex_trade_notifs', JSON.stringify(data)); } catch (e) {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_notifs');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return BASELINE_NOTIFICATIONS;
  } catch {
    const local = localStorage.getItem('ferex_trade_notifs');
    return local ? JSON.parse(local) : BASELINE_NOTIFICATIONS;
  }
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
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeContainersCount: activeShipments.length,
      totalVolumeStr: formatCr(totalVolume || 48200000),
      openLCsStr: formatCr(openLCsAmount || 35500000),
      clearedPaymentsStr: formatCr(clearedPaymentsAmount || 39270000),
      activeShipments,
      recentInvoices: invoices.slice(0, 5),
    };
  } catch {
    return {
      activeContainersCount: 3,
      totalVolumeStr: '₹4.82 Cr',
      openLCsStr: '₹3.55 Cr',
      clearedPaymentsStr: '₹3.92 Cr',
      activeShipments: BASELINE_SHIPMENTS,
      recentInvoices: BASELINE_INVOICES,
    };
  }
}
