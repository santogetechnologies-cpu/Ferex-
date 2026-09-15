import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── MASTER DATA DEFINITIONS ──────────────────────────────────────────────────
export const TRADE_MASTER_PORTS = [
  'Port of Gdansk, Poland',
  'Port of Gdynia, Poland',
  'Port of Rotterdam, Netherlands',
  'Port of Hamburg, Germany',
  'Port of Antwerp, Belgium',
  'Port of Singapore, Singapore',
  'Port of Shanghai, China',
  'Port of Ningbo-Zhoushan, China',
  'Port of Busan, South Korea',
  'Port of Nhava Sheva (JNPT), India',
  'Port of Mundra, India',
  'Port of Chennai, India',
  'Port of Jebel Ali, Dubai UAE',
  'Port of Felixstowe, UK',
  'Port of Houston, USA',
  'Port of Los Angeles, USA',
];

export const TRADE_MASTER_CARRIERS = [
  'Maersk Line',
  'MSC (Mediterranean Shipping Company)',
  'CMA CGM Group',
  'Hapag-Lloyd',
  'Evergreen Marine',
  'COSCO Shipping Lines',
  'Ocean Network Express (ONE)',
  'Yang Ming Marine Transport',
  'ZIM Integrated Shipping',
  'Hyundai Merchant Marine (HMM)',
];

export const TRADE_MASTER_VESSELS = [
  'MSC Gülsün (IMO: 9839438)',
  'Madrid Maersk (IMO: 9778791)',
  'CMA CGM Jacques Saadé (IMO: 9839179)',
  'Hapag-Lloyd Berlin Express (IMO: 9943865)',
  'Ever Given (IMO: 9811000)',
  'COSCO Universe (IMO: 9795610)',
  'ONE Triumph (IMO: 9769271)',
];

export const TRADE_MASTER_BANKS = [
  'HSBC London Trade Banking',
  'BNP Paribas Trade Finance Paris',
  'Standard Chartered Singapore',
  'State Bank of India Overseas Banking',
  'Citibank N.A. International Trade Desk',
  'Barclays Corporate & Trade Finance UK',
  'Deutsche Bank AG Frankfurt',
  'Emirates NBD Trade Finance Dubai',
  'Bank Pekao S.A. Trade Desk Warsaw',
  'Santander Bank Polska Trade Banking',
];

export const TRADE_MASTER_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'PLN', 'AED'];

export const TRADE_MASTER_INCOTERMS = [
  'FOB (Free On Board)',
  'CIF (Cost, Insurance and Freight)',
  'CFR (Cost and Freight)',
  'EXW (Ex Works)',
  'DDP (Delivered Duty Paid)',
  'DAP (Delivered at Place)',
  'FCA (Free Carrier)',
  'CIP (Carriage and Insurance Paid to)',
];

export const TRADE_MASTER_PAYMENT_METHODS = [
  'SWIFT Wire Transfer',
  'Bank Transfer',
  'LC Settlement (Documentary Letter of Credit)',
  'Direct Bank Settlement',
  'Escrow Guarantee Release',
  'Trade Draft / Bill of Exchange',
  'Corporate Credit Card',
];

export const TRADE_MASTER_DOC_TYPES = [
  'Commercial Invoice',
  'Bill of Lading (B/L)',
  'Packing List',
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'EUR.1 Movement Certificate',
  'Inspection & Quality Certificate',
  'Marine Cargo Insurance Policy',
  'Fumigation Certificate',
  'Customs Entry / Clearance Slip',
  'Letter of Credit (MT700)',
];

export const TRADE_MASTER_CERT_TYPES = [
  'Certificate of Origin (Non-Preferential)',
  'Phytosanitary Certificate (Plant Health)',
  'Quality & Inspection Analysis Certificate',
  'EUR.1 Movement Certificate',
  'Fumigation & Pest Control Certificate',
  'Health & Food Safety Certificate',
  'Non-GMO & Organic Certification',
  'Radioactivity Clearance Certificate',
];

export const TRADE_MASTER_PARTNER_CATEGORIES = [
  'Buyer / Importer',
  'Seller / Exporter',
  'Supplier / Manufacturer',
  'Logistics Partner / Freight Forwarder',
  'Customs Broker / Clearance Agent',
  'Trade Finance Bank / Financial Institution',
  'Port Authority / Terminal Operator',
  'Inspection & Quality Assurance Body',
];

export const TRADE_SHIPMENT_STATUSES = [
  'Draft',
  'Booked',
  'Cargo Ready',
  'In Transit',
  'At Port',
  'Customs Clearance',
  'Cleared',
  'Delivered',
  'Closed',
];

export const TRADE_INVOICE_STATUSES = [
  'Draft',
  'Issued',
  'Sent',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
];

export const TRADE_LC_STATUSES = [
  'Draft',
  'Issued',
  'Advised',
  'Documents Submitted',
  'Under Review',
  'Accepted',
  'Discrepancy',
  'Settled',
  'Expired',
];

export const TRADE_BL_STATUSES = [
  'Draft',
  'Submitted',
  'Issued',
  'Amended',
  'Released',
  'Surrendered',
];

export const TRADE_PAYMENT_STATUSES = [
  'Pending',
  'Processing',
  'Completed',
  'Cleared',
  'Failed',
  'Reversed',
];

// ─── INITIAL SEED GENERATOR ──────────────────────────────────────────────────
function initSeedData() {
  if (typeof window === 'undefined') return;

  // 1. CRM Partners
  if (!localStorage.getItem('ferex_trade_crm')) {
    const seedCRM = [
      {
        id: 'CRM-1001',
        name: 'Baltic Grain Sp. z o.o.',
        company_name: 'Baltic Grain Sp. z o.o.',
        category: 'Buyer / Importer',
        contact: 'Janusz Kowalski',
        email: 'j.kowalski@balticgrain.pl',
        phone: '+48 58 661 9020',
        country: 'Poland',
        city: 'Gdansk',
        vat_number: 'PL5830009921',
        payment_terms: 'Letter of Credit at Sight',
        status: 'Active',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: 'CRM-1002',
        name: 'Warsaw Agro Logistics S.A.',
        company_name: 'Warsaw Agro Logistics S.A.',
        category: 'Logistics Partner / Freight Forwarder',
        contact: 'Magdalena Nowak',
        email: 'magda.nowak@warsawagro.com',
        phone: '+48 22 845 1100',
        country: 'Poland',
        city: 'Warsaw',
        vat_number: 'PL5252001144',
        payment_terms: 'Net 30 Days',
        status: 'Active',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      },
      {
        id: 'CRM-1003',
        name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        company_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        category: 'Seller / Exporter',
        contact: 'Klaus Weber',
        email: 'klaus.weber@hamburgsteel.de',
        phone: '+49 40 3344 5500',
        country: 'Germany',
        city: 'Hamburg',
        vat_number: 'DE118543990',
        payment_terms: 'SWIFT Wire Transfer 50/50',
        status: 'Active',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: 'CRM-1004',
        name: 'Dubai Gold & Maritime Trading LLC',
        company_name: 'Dubai Gold & Maritime Trading LLC',
        category: 'Buyer / Importer',
        contact: 'Tariq Al-Mansoor',
        email: 'tariq@dubaigoldtrade.ae',
        phone: '+971 4 399 2200',
        country: 'UAE',
        city: 'Dubai',
        vat_number: 'AE1002994883',
        payment_terms: 'Confirmed Irrevocable LC',
        status: 'Active',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: 'CRM-1005',
        name: 'HSBC London Global Trade Desk',
        company_name: 'HSBC London Global Trade Desk',
        category: 'Trade Finance Bank / Financial Institution',
        contact: 'Alistair Vance',
        email: 'alistair.vance@hsbc.co.uk',
        phone: '+44 20 7991 8888',
        country: 'United Kingdom',
        city: 'London',
        vat_number: 'GB234556677',
        payment_terms: 'Interbank Settlement',
        status: 'Active',
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_crm', JSON.stringify(seedCRM));
  }

  // 2. Shipments
  if (!localStorage.getItem('ferex_trade_shipments')) {
    const seedShipments = [
      {
        id: 'SHP-9821',
        shipment_no: 'SHP-9821',
        partner_id: 'CRM-1001',
        partner_name: 'Baltic Grain Sp. z o.o.',
        container_no: 'MSCU-902184-7',
        carrier: 'MSC (Mediterranean Shipping Company)',
        carrier_vessel: 'MSC Gülsün (IMO: 9839438)',
        voyage_no: 'VY-2026-088',
        origin_port: 'Port of Gdansk, Poland',
        destination_port: 'Port of Nhava Sheva (JNPT), India',
        cargo_description: 'Agricultural Milling Wheat Grade-A (Bulk 40ft Reefer)',
        commodity: 'Milling Wheat',
        cargo_weight_kg: 26500,
        container_count: 2,
        transport_mode: 'Maritime',
        incoterm: 'CIF (Cost, Insurance and Freight)',
        shipment_status: 'In Transit',
        status: 'In Transit',
        customs_status: 'Pre-Cleared Polish Customs',
        payment_status: 'Partially Paid',
        etd: '2026-09-02',
        eta: '2026-09-24',
        cargo_value: 3850000,
        currency: 'INR',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'SHP-9822',
        shipment_no: 'SHP-9822',
        partner_id: 'CRM-1003',
        partner_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        container_no: 'MAEU-448102-1',
        carrier: 'Maersk Line',
        carrier_vessel: 'Madrid Maersk (IMO: 9778791)',
        voyage_no: 'VY-2026-091',
        origin_port: 'Port of Hamburg, Germany',
        destination_port: 'Port of Mundra, India',
        cargo_description: 'Cold Rolled Steel Coils EN 10130 Grade DC01',
        commodity: 'Steel Coils',
        cargo_weight_kg: 44000,
        container_count: 2,
        transport_mode: 'Maritime',
        incoterm: 'FOB (Free On Board)',
        shipment_status: 'At Port',
        status: 'At Port',
        customs_status: 'Customs Inspection Requested',
        payment_status: 'Paid',
        etd: '2026-08-28',
        eta: '2026-09-18',
        cargo_value: 6200000,
        currency: 'INR',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'SHP-9823',
        shipment_no: 'SHP-9823',
        partner_id: 'CRM-1004',
        partner_name: 'Dubai Gold & Maritime Trading LLC',
        container_no: 'CMAU-772910-3',
        carrier: 'CMA CGM Group',
        carrier_vessel: 'CMA CGM Jacques Saadé (IMO: 9839179)',
        voyage_no: 'VY-2026-104',
        origin_port: 'Port of Jebel Ali, Dubai UAE',
        destination_port: 'Port of Gdansk, Poland',
        cargo_description: 'Industrial Petrochemical Polymers & Granules',
        commodity: 'Polymers',
        cargo_weight_kg: 22000,
        container_count: 1,
        transport_mode: 'Maritime',
        incoterm: 'CIF (Cost, Insurance and Freight)',
        shipment_status: 'Cargo Ready',
        status: 'Cargo Ready',
        customs_status: 'Export Clearance Verified',
        payment_status: 'Issued',
        etd: '2026-09-19',
        eta: '2026-10-06',
        cargo_value: 2950000,
        currency: 'INR',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_shipments', JSON.stringify(seedShipments));
  }

  // 3. Invoices
  if (!localStorage.getItem('ferex_trade_invoices')) {
    const seedInvoices = [
      {
        id: 'INV-TRD-88210',
        invoice_no: 'INV-TRD-88210',
        shipment_no: 'SHP-9821',
        buyer_name: 'Baltic Grain Sp. z o.o.',
        seller_name: 'FEREX Global Trade Operations Ltd',
        incoterms: 'CIF (Cost, Insurance and Freight)',
        amount: 3850000,
        subtotal: 3500000,
        freight_charges: 250000,
        insurance_charges: 100000,
        tax_charges: 0,
        currency: 'INR',
        status: 'Partially Paid',
        payment_status: 'Partially Paid',
        amount_paid: 2000000,
        outstanding_amount: 1850000,
        payment_terms: 'Letter of Credit (LC) at Sight',
        lc_reference: 'LC-HSBC-2026-0941',
        issue_date: '2026-09-01',
        due_date: '2026-10-15',
        items: [
          {
            description: 'Agricultural Milling Wheat Grade-A (Bulk 40ft Reefer)',
            hs_code: '1001.99',
            quantity: 26.5,
            unit: 'Metric Tons',
            unit_price: 132075.47,
            total: 3500000,
          },
        ],
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'INV-TRD-88211',
        invoice_no: 'INV-TRD-88211',
        shipment_no: 'SHP-9822',
        buyer_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        seller_name: 'FEREX Global Trade Operations Ltd',
        incoterms: 'FOB (Free On Board)',
        amount: 6200000,
        subtotal: 5800000,
        freight_charges: 300000,
        insurance_charges: 100000,
        tax_charges: 0,
        currency: 'INR',
        status: 'Paid',
        payment_status: 'Paid',
        amount_paid: 6200000,
        outstanding_amount: 0,
        payment_terms: 'SWIFT Wire Transfer 50/50',
        lc_reference: '',
        issue_date: '2026-08-25',
        due_date: '2026-09-20',
        paid_at: '2026-09-05T14:30:00Z',
        items: [
          {
            description: 'Cold Rolled Steel Coils EN 10130 Grade DC01',
            hs_code: '7209.16',
            quantity: 44,
            unit: 'Metric Tons',
            unit_price: 131818.18,
            total: 5800000,
          },
        ],
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: 'INV-TRD-88212',
        invoice_no: 'INV-TRD-88212',
        shipment_no: 'SHP-9823',
        buyer_name: 'Dubai Gold & Maritime Trading LLC',
        seller_name: 'FEREX Global Trade Operations Ltd',
        incoterms: 'CIF (Cost, Insurance and Freight)',
        amount: 2950000,
        subtotal: 2750000,
        freight_charges: 150000,
        insurance_charges: 50000,
        tax_charges: 0,
        currency: 'INR',
        status: 'Issued',
        payment_status: 'Issued',
        amount_paid: 0,
        outstanding_amount: 2950000,
        payment_terms: 'Confirmed Irrevocable LC',
        lc_reference: 'LC-ENBD-2026-0112',
        issue_date: '2026-09-12',
        due_date: '2026-10-30',
        items: [
          {
            description: 'Industrial Petrochemical Polymers & Granules',
            hs_code: '3901.10',
            quantity: 22,
            unit: 'Metric Tons',
            unit_price: 125000,
            total: 2750000,
          },
        ],
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_invoices', JSON.stringify(seedInvoices));
  }

  // 4. Bills of Lading
  if (!localStorage.getItem('ferex_trade_bls')) {
    const seedBLs = [
      {
        id: 'BL-9821-MSC',
        bl_number: 'BL-9821-MSC',
        shipment_no: 'SHP-9821',
        vessel_name: 'MSC Gülsün (IMO: 9839438)',
        voyage_no: 'VY-2026-088',
        carrier: 'MSC (Mediterranean Shipping Company)',
        port_of_loading: 'Port of Gdansk, Poland',
        port_of_discharge: 'Port of Nhava Sheva (JNPT), India',
        shipper: 'FEREX Global Trade Operations Ltd',
        consignee: 'Baltic Grain Sp. z o.o.',
        notify_party: 'Janusz Kowalski Logistics Unit, Gdansk',
        container_no: 'MSCU-902184-7',
        cargo_description: 'Agricultural Milling Wheat Grade-A',
        total_packages: 48,
        package_type: 'Bulk Grain Flexibags',
        gross_weight_kg: 26500,
        freight_terms: 'Freight Prepaid',
        issue_date: '2026-09-02',
        status: 'Issued',
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'BL-9822-MSK',
        bl_number: 'BL-9822-MSK',
        shipment_no: 'SHP-9822',
        vessel_name: 'Madrid Maersk (IMO: 9778791)',
        voyage_no: 'VY-2026-091',
        carrier: 'Maersk Line',
        port_of_loading: 'Port of Hamburg, Germany',
        port_of_discharge: 'Port of Mundra, India',
        shipper: 'Hamburg Steel & Commodity Handelsgesellschaft',
        consignee: 'FEREX Global Trade Operations Ltd',
        notify_party: 'FEREX India Receiving Port Operations',
        container_no: 'MAEU-448102-1',
        cargo_description: 'Cold Rolled Steel Coils EN 10130',
        total_packages: 12,
        package_type: 'Heavy Wooden Skids',
        gross_weight_kg: 44000,
        freight_terms: 'Freight Collect',
        issue_date: '2026-08-28',
        status: 'Released',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_bls', JSON.stringify(seedBLs));
  }

  // 5. Packing Lists
  if (!localStorage.getItem('ferex_trade_pls')) {
    const seedPLs = [
      {
        id: 'PL-2026-9821',
        pl_number: 'PL-2026-9821',
        shipment_no: 'SHP-9821',
        invoice_no: 'INV-TRD-88210',
        buyer_name: 'Baltic Grain Sp. z o.o.',
        cargo_description: 'Agricultural Milling Wheat Grade-A',
        package_type: 'Food-Grade Palletised Flexitanks',
        total_packages: 48,
        gross_weight_kg: 26500,
        net_weight_kg: 25800,
        dimensions: '40ft Standard High Cube Container',
        volume_cbm: 67.5,
        marks_numbers: 'FEREX/BG/2026/01-48',
        container_status: 'Loaded & Sealed (Customs Inspected)',
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'PL-2026-9822',
        pl_number: 'PL-2026-9822',
        shipment_no: 'SHP-9822',
        invoice_no: 'INV-TRD-88211',
        buyer_name: 'Hamburg Steel & Commodity Handelsgesellschaft',
        cargo_description: 'Cold Rolled Steel Coils EN 10130 Grade DC01',
        package_type: 'Steel Banded Heavy Pallets',
        total_packages: 12,
        gross_weight_kg: 44000,
        net_weight_kg: 43200,
        dimensions: '2x 20ft Heavy Duty ISO Containers',
        volume_cbm: 42.0,
        marks_numbers: 'HAM-STEEL-FEREX-001/012',
        container_status: 'Loaded & Sealed',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_pls', JSON.stringify(seedPLs));
  }

  // 6. Certificates
  if (!localStorage.getItem('ferex_trade_certs')) {
    const seedCerts = [
      {
        id: 'CRT-2026-101',
        certificate_no: 'CRT-2026-101',
        shipment_no: 'SHP-9821',
        cert_type: 'Certificate of Origin (Non-Preferential)',
        title: 'EU Non-Preferential Certificate of Origin',
        exporter: 'FEREX Global Trade Operations Ltd',
        importer: 'Baltic Grain Sp. z o.o.',
        authority: 'Polish Chamber of Commerce (KIG), Warsaw',
        country: 'Poland',
        issue_date: '2026-09-02',
        expiry_date: '2027-09-02',
        status: 'Verified & Active',
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'CRT-2026-102',
        certificate_no: 'CRT-2026-102',
        shipment_no: 'SHP-9821',
        cert_type: 'Phytosanitary Certificate (Plant Health)',
        title: 'State Phytosanitary & Plant Quarantine Inspection Slip',
        exporter: 'FEREX Global Trade Operations Ltd',
        importer: 'Baltic Grain Sp. z o.o.',
        authority: 'Main Inspectorate of Plant Health & Seed Inspection (PIORiN)',
        country: 'Poland',
        issue_date: '2026-09-02',
        expiry_date: '2026-12-02',
        status: 'Verified & Active',
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'CRT-2026-103',
        certificate_no: 'CRT-2026-103',
        shipment_no: 'SHP-9822',
        cert_type: 'Quality & Inspection Analysis Certificate',
        title: 'SGS Metallurgical Quality & Tensile Test Certificate',
        exporter: 'Hamburg Steel & Commodity Handelsgesellschaft',
        importer: 'FEREX Global Trade Operations Ltd',
        authority: 'SGS Germany GmbH Industrial Inspection Desk',
        country: 'Germany',
        issue_date: '2026-08-27',
        expiry_date: '2027-08-27',
        status: 'Verified & Active',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_certs', JSON.stringify(seedCerts));
  }

  // 7. Letters of Credit
  if (!localStorage.getItem('ferex_trade_lcs')) {
    const seedLCs = [
      {
        id: 'LC-HSBC-2026-0941',
        lc_number: 'LC-HSBC-2026-0941',
        applicant: 'Baltic Grain Sp. z o.o.',
        beneficiary: 'FEREX Global Trade Operations Ltd',
        issuing_bank: 'HSBC London Trade Banking',
        advising_bank: 'State Bank of India Overseas Banking',
        amount: 3850000,
        currency: 'INR',
        shipment_no: 'SHP-9821',
        invoice_no: 'INV-TRD-88210',
        payment_terms: '100% Sight against Clean On-Board B/L + Phytosanitary Cert',
        required_documents: 'Commercial Invoice (3x), Full set Ocean B/L (3/3), Certificate of Origin, Phytosanitary Cert',
        issue_date: '2026-09-01',
        expiry_date: '2026-11-15',
        status: 'Documents Submitted',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'LC-ENBD-2026-0112',
        lc_number: 'LC-ENBD-2026-0112',
        applicant: 'Dubai Gold & Maritime Trading LLC',
        beneficiary: 'FEREX Global Trade Operations Ltd',
        issuing_bank: 'Emirates NBD Trade Finance Dubai',
        advising_bank: 'Standard Chartered Singapore',
        amount: 2950000,
        currency: 'INR',
        shipment_no: 'SHP-9823',
        invoice_no: 'INV-TRD-88212',
        payment_terms: 'Irrevocable Confirmed LC 60 Days from B/L Date',
        required_documents: 'Commercial Invoice, Packing List, Original B/L, Certificate of Analysis',
        issue_date: '2026-09-12',
        expiry_date: '2026-12-31',
        status: 'Issued',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_lcs', JSON.stringify(seedLCs));
  }

  // 8. Payments Ledger (Inbound + Outbound)
  if (!localStorage.getItem('ferex_trade_payments')) {
    const seedPayments = [
      {
        id: 'TX-TRD-5001',
        transaction_ref: 'TX-TRD-5001',
        flow_type: 'inbound',
        partner_entity: 'Baltic Grain Sp. z o.o.',
        invoice_no: 'INV-TRD-88210',
        shipment_no: 'SHP-9821',
        lc_reference: 'LC-HSBC-2026-0941',
        description: 'Advance 50% Settlement for Milling Wheat Export',
        amount: 2000000,
        currency: 'INR',
        bank_name: 'HSBC London Trade Banking',
        account_no: 'GB29HSBC40051512345678',
        payment_type: 'LC Settlement (Documentary Letter of Credit)',
        status: 'Completed',
        settlement_date: '2026-09-04',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'TX-TRD-5002',
        transaction_ref: 'TX-TRD-5002',
        flow_type: 'outbound',
        partner_entity: 'MSC (Mediterranean Shipping Company)',
        invoice_no: 'INV-TRD-88210',
        shipment_no: 'SHP-9821',
        description: 'Ocean Freight Booking Fee (Gdansk -> Nhava Sheva 2x40HC)',
        amount: 250000,
        currency: 'INR',
        bank_name: 'State Bank of India Overseas Banking',
        account_no: 'IN88SBIN00401199201',
        payment_type: 'SWIFT Wire Transfer',
        status: 'Completed',
        settlement_date: '2026-09-03',
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'TX-TRD-5003',
        transaction_ref: 'TX-TRD-5003',
        flow_type: 'inbound',
        partner_entity: 'Hamburg Steel & Commodity Handelsgesellschaft',
        invoice_no: 'INV-TRD-88211',
        shipment_no: 'SHP-9822',
        description: 'Full Invoice Settlement for Cold Rolled Steel Coils',
        amount: 6200000,
        currency: 'INR',
        bank_name: 'Deutsche Bank AG Frankfurt',
        account_no: 'DE89DBNK10070000123456',
        payment_type: 'SWIFT Wire Transfer',
        status: 'Completed',
        settlement_date: '2026-09-05',
        created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: 'TX-TRD-5004',
        transaction_ref: 'TX-TRD-5004',
        flow_type: 'outbound',
        partner_entity: 'Port of Gdansk Port Authority',
        shipment_no: 'SHP-9821',
        description: 'Customs Terminal Handling & Container Seal Verification',
        amount: 45000,
        currency: 'INR',
        bank_name: 'Bank Pekao S.A. Trade Desk Warsaw',
        account_no: 'PL6412401037111100000921',
        payment_type: 'Direct Bank Settlement',
        status: 'Completed',
        settlement_date: '2026-09-02',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_payments', JSON.stringify(seedPayments));
  }

  // 9. Documents Vault
  if (!localStorage.getItem('ferex_trade_docs')) {
    const seedDocs = [
      {
        id: 'DOC-TRD-001',
        document_name: 'Commercial_Invoice_INV-88210_Signed.pdf',
        folder: 'Commercial Invoices',
        file_size: '1.8 MB',
        doc_type: 'Commercial Invoice',
        shipment_no: 'SHP-9821',
        invoice_no: 'INV-TRD-88210',
        partner_name: 'Baltic Grain Sp. z o.o.',
        is_verified: true,
        verification_status: 'Verified',
        uploaded_by: 'Trade Director (FEREX Operations)',
        uploaded_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'DOC-TRD-002',
        document_name: 'Ocean_Bill_of_Lading_BL-9821-MSC_Clean.pdf',
        folder: 'Bills of Lading',
        file_size: '2.4 MB',
        doc_type: 'Bill of Lading (B/L)',
        shipment_no: 'SHP-9821',
        partner_name: 'MSC (Mediterranean Shipping Company)',
        is_verified: true,
        verification_status: 'Verified',
        uploaded_by: 'MSC Ocean Desk',
        uploaded_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'DOC-TRD-003',
        document_name: 'EU_Certificate_of_Origin_KIG_Warsaw.pdf',
        folder: 'Certificates of Origin',
        file_size: '1.2 MB',
        doc_type: 'Certificate of Origin',
        shipment_no: 'SHP-9821',
        partner_name: 'Baltic Grain Sp. z o.o.',
        is_verified: true,
        verification_status: 'Verified',
        uploaded_by: 'Polish Chamber of Commerce (KIG)',
        uploaded_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'DOC-TRD-004',
        document_name: 'Letter_of_Credit_MT700_HSBC_Authenticated.pdf',
        folder: 'Letters of Credit',
        file_size: '950 KB',
        doc_type: 'Letter of Credit (MT700)',
        shipment_no: 'SHP-9821',
        invoice_no: 'INV-TRD-88210',
        partner_name: 'HSBC London Trade Banking',
        is_verified: true,
        verification_status: 'Verified',
        uploaded_by: 'HSBC Trade Operations',
        uploaded_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_docs', JSON.stringify(seedDocs));
  }

  // 10. Notifications
  if (!localStorage.getItem('ferex_trade_notifs')) {
    const seedNotifs = [
      {
        id: 'NOTIF-01',
        title: 'Shipment SHP-9821 Vessel Departure Confirmed',
        description: 'MSC Gülsün has departed Port of Gdansk en route to Nhava Sheva. ETA 2026-09-24.',
        category: 'Shipments',
        is_read: false,
        is_archived: false,
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'NOTIF-02',
        title: 'Payment Settlement Received: ₹20,00,000',
        description: 'LC Advance settlement credited for INV-TRD-88210 from Baltic Grain Sp. z o.o.',
        category: 'Payments',
        is_read: false,
        is_archived: false,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'NOTIF-03',
        title: 'Customs Pre-Clearance Approved',
        description: 'Polish customs inspection completed for container MSCU-902184-7.',
        category: 'Compliance',
        is_read: true,
        is_archived: false,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_notifs', JSON.stringify(seedNotifs));
  }
}

// Run initial seed check
initSeedData();

// ─── 1. TRADE SHIPMENTS ───────────────────────────────────────────────────────
export async function getTradeShipments() {
  initSeedData();
  let localShipments: any[] = [];
  const local = localStorage.getItem('ferex_trade_shipments');
  if (local !== null) {
    try { localShipments = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const item of localShipments) {
        if (!merged.some((m: any) => m.id === item.id || m.shipment_no === item.shipment_no)) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localShipments;
  } catch {
    return localShipments;
  }
}

export async function createTradeShipment(shipment: {
  container_no: string;
  partner_id?: string;
  partner_name?: string;
  carrier?: string;
  carrier_vessel?: string;
  voyage_no?: string;
  origin_port?: string;
  destination_port?: string;
  cargo_description: string;
  commodity?: string;
  cargo_weight_kg?: number;
  container_count?: number;
  transport_mode?: string;
  incoterm?: string;
  eta?: string;
  etd?: string;
  status?: string;
  customs_status?: string;
  payment_status?: string;
  cargo_value?: number;
  currency?: string;
}) {
  const newId = generateUUID();
  const shipmentNo = `SHP-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    id: newId,
    shipment_no: shipmentNo,
    partner_id: shipment.partner_id || '',
    partner_name: shipment.partner_name || 'Global Trade Partner',
    container_no: shipment.container_no,
    carrier: shipment.carrier || 'Maersk Line',
    carrier_vessel: shipment.carrier_vessel || 'MSC Gülsün (IMO: 9839438)',
    voyage_no: shipment.voyage_no || `VY-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    origin_port: shipment.origin_port || 'Port of Gdansk, Poland',
    destination_port: shipment.destination_port || 'Port of Nhava Sheva (JNPT), India',
    cargo_description: shipment.cargo_description,
    commodity: shipment.commodity || shipment.cargo_description,
    cargo_weight_kg: Number(shipment.cargo_weight_kg) || 20000,
    container_count: Number(shipment.container_count) || 1,
    transport_mode: shipment.transport_mode || 'Maritime',
    incoterm: shipment.incoterm || 'CIF (Cost, Insurance and Freight)',
    shipment_status: shipment.status || 'Booked',
    status: shipment.status || 'Booked',
    customs_status: shipment.customs_status || 'Pre-Clearance In Progress',
    payment_status: shipment.payment_status || 'Issued',
    eta: shipment.eta || new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    etd: shipment.etd || new Date().toISOString().split('T')[0],
    cargo_value: Number(shipment.cargo_value) || 2500000,
    currency: shipment.currency || 'INR',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeShipments();
  const updated = [payload, ...current.filter((s: any) => s.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_shipments').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Shipment ${shipmentNo} Booked`,
    description: `New cargo shipment ${shipmentNo} booked with ${payload.carrier} from ${payload.origin_port} to ${payload.destination_port}.`,
    category: 'Shipments',
  });

  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return payload;
}

export async function updateTradeShipment(id: string, updates: any) {
  const current = await getTradeShipments();
  const updated = current.map((s: any) =>
    (s.id === id || s.shipment_no === id)
      ? { ...s, ...updates, updated_at: new Date().toISOString() }
      : s
  );
  try { localStorage.setItem('ferex_trade_shipments', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_shipments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .or(`id.eq.${id},shipment_no.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_shipments_change'));
  return updates;
}

export async function updateTradeShipmentStatus(id: string, status: string) {
  return updateTradeShipment(id, { status, shipment_status: status });
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
  initSeedData();
  let localInvoices: any[] = [];
  const local = localStorage.getItem('ferex_trade_invoices');
  if (local !== null) {
    try { localInvoices = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const item of localInvoices) {
        if (!merged.some((m: any) => m.id === item.id || m.invoice_no === item.invoice_no)) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localInvoices;
  } catch {
    return localInvoices;
  }
}

export async function createTradeInvoice(inv: {
  invoice_no?: string;
  shipment_no?: string;
  buyer_name: string;
  seller_name?: string;
  incoterms?: string;
  amount: number;
  subtotal?: number;
  freight_charges?: number;
  insurance_charges?: number;
  tax_charges?: number;
  currency?: string;
  payment_terms?: string;
  lc_reference?: string;
  due_date?: string;
  status?: string;
  items?: any[];
}) {
  const newId = generateUUID();
  const invNo = inv.invoice_no || `INV-TRD-${Math.floor(10000 + Math.random() * 90000)}`;
  const totalAmount = Number(inv.amount) || 0;
  
  const payload = {
    id: newId,
    invoice_no: invNo,
    shipment_no: inv.shipment_no || '',
    buyer_name: inv.buyer_name,
    seller_name: inv.seller_name || 'FEREX Global Trade Operations Ltd',
    incoterms: inv.incoterms || 'CIF (Cost, Insurance and Freight)',
    amount: totalAmount,
    subtotal: Number(inv.subtotal) || totalAmount,
    freight_charges: Number(inv.freight_charges) || 0,
    insurance_charges: Number(inv.insurance_charges) || 0,
    tax_charges: Number(inv.tax_charges) || 0,
    currency: inv.currency || 'INR',
    status: inv.status || 'Issued',
    payment_status: inv.status || 'Issued',
    amount_paid: 0,
    outstanding_amount: totalAmount,
    payment_terms: inv.payment_terms || 'Letter of Credit (LC) at Sight',
    lc_reference: inv.lc_reference || '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: inv.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: inv.items || [
      {
        description: 'Trade Commodity Cargo',
        hs_code: '1001.99',
        quantity: 1,
        unit: 'Shipment Lot',
        unit_price: totalAmount,
        total: totalAmount,
      },
    ],
    created_at: new Date().toISOString(),
  };

  const current = await getTradeInvoices();
  const updated = [payload, ...current.filter((i: any) => i.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_invoices').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Commercial Invoice ${invNo} Generated`,
    description: `Invoice ${invNo} issued for ₹${totalAmount.toLocaleString('en-IN')} to ${payload.buyer_name}.`,
    category: 'Finance',
  });

  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return payload;
}

export async function updateTradeInvoice(id: string, updates: any) {
  const current = await getTradeInvoices();
  const updated = current.map((i: any) =>
    (i.id === id || i.invoice_no === id)
      ? { ...i, ...updates, updated_at: new Date().toISOString() }
      : i
  );
  try { localStorage.setItem('ferex_trade_invoices', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .or(`id.eq.${id},invoice_no.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  return updates;
}

export async function updateTradeInvoiceStatus(id: string, status: string) {
  const current = await getTradeInvoices();
  const inv = current.find((i: any) => i.id === id || i.invoice_no === id);
  const amount = inv ? Number(inv.amount || 0) : 0;
  
  const updates: any = {
    status,
    payment_status: status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'Paid') {
    updates.amount_paid = amount;
    updates.outstanding_amount = 0;
    updates.paid_at = new Date().toISOString();
  } else if (status === 'Partially Paid') {
    updates.amount_paid = amount * 0.5;
    updates.outstanding_amount = amount * 0.5;
  }
  
  return updateTradeInvoice(id, updates);
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
  initSeedData();
  let localContacts: any[] = [];
  const local = localStorage.getItem('ferex_trade_crm');
  if (local !== null) {
    try { localContacts = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('trade_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const item of localContacts) {
        if (!merged.some((m: any) => m.id === item.id)) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_trade_crm', JSON.stringify(merged)); } catch {}
      return merged;
    }
    return localContacts;
  } catch {
    return localContacts;
  }
}

export async function createTradeCRMContact(client: {
  company_name: string;
  category?: string;
  contact_person?: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  vat_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  status?: string;
}) {
  const newId = `CRM-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    id: newId,
    name: client.company_name,
    company_name: client.company_name,
    category: client.category || 'Buyer / Importer',
    contact: client.contact_person || 'Managing Representative',
    contact_person: client.contact_person || 'Managing Representative',
    email: client.email,
    phone: client.phone || '+48 58 000 0000',
    country: client.country || 'Poland',
    city: client.city || 'Gdansk',
    vat_number: client.vat_number || 'PL0000000000',
    payment_terms: client.payment_terms || 'Letter of Credit at Sight',
    credit_limit: Number(client.credit_limit) || 10000000,
    status: client.status || 'Active',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeCRMContacts();
  const updated = [payload, ...current.filter((c: any) => c.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_clients').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Trade Partner Added: ${payload.company_name}`,
    description: `${payload.company_name} registered under ${payload.category}.`,
    category: 'CRM',
  });

  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return payload;
}

export async function updateTradeCRMContact(id: string, updates: any) {
  const current = await getTradeCRMContacts();
  const updated = current.map((c: any) =>
    (c.id === id || c.company_name === id)
      ? { ...c, ...updates, name: updates.company_name || c.name, updated_at: new Date().toISOString() }
      : c
  );
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return updates;
}

export async function deleteTradeCRMContact(id: string) {
  const current = await getTradeCRMContacts();
  const filtered = current.filter((c: any) => c.id !== id);
  try { localStorage.setItem('ferex_trade_crm', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_clients').delete().eq('id', id); } catch {}
  window.dispatchEvent(new Event('ferex_trade_crm_change'));
  return true;
}

// ─── 4. LETTERS OF CREDIT (LC) ───────────────────────────────────────────────
export async function getTradeLettersOfCredit() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_letters_of_credit')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_lcs');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_lcs');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradeLetterOfCredit(lc: {
  lc_number?: string;
  applicant: string;
  beneficiary?: string;
  issuing_bank: string;
  advising_bank?: string;
  amount: number;
  currency?: string;
  shipment_no?: string;
  invoice_no?: string;
  payment_terms?: string;
  required_documents?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const lcNo = lc.lc_number || `LC-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`;
  const payload = {
    id: newId,
    lc_number: lcNo,
    applicant: lc.applicant,
    beneficiary: lc.beneficiary || 'FEREX Global Trade Operations Ltd',
    issuing_bank: lc.issuing_bank,
    advising_bank: lc.advising_bank || 'State Bank of India Overseas Banking',
    amount: Number(lc.amount) || 0,
    currency: lc.currency || 'INR',
    shipment_no: lc.shipment_no || '',
    invoice_no: lc.invoice_no || '',
    payment_terms: lc.payment_terms || '100% Sight against Clean On-Board B/L',
    required_documents: lc.required_documents || 'Commercial Invoice (3x), Full set Ocean B/L (3/3), Certificate of Origin',
    issue_date: lc.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: lc.expiry_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    status: lc.status || 'Issued',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeLettersOfCredit();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_letters_of_credit').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Letter of Credit ${lcNo} Registered`,
    description: `LC ${lcNo} for ₹${Number(lc.amount).toLocaleString('en-IN')} issued by ${payload.issuing_bank}.`,
    category: 'Finance',
  });

  window.dispatchEvent(new Event('ferex_trade_lcs_change'));
  return payload;
}

export async function updateTradeLetterOfCreditStatus(id: string, status: string) {
  const current = await getTradeLettersOfCredit();
  const updated = current.map((item: any) =>
    (item.id === id || item.lc_number === id)
      ? { ...item, status, updated_at: new Date().toISOString() }
      : item
  );
  try { localStorage.setItem('ferex_trade_lcs', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_letters_of_credit')
      .update({ status, updated_at: new Date().toISOString() })
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

// ─── 5. BILLS OF LADING (B/L) ────────────────────────────────────────────────
export async function getTradeBillsOfLading() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_bls', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_bls');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_bls');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradeBillOfLading(bl: {
  bl_number?: string;
  shipment_no?: string;
  vessel_name: string;
  voyage_no?: string;
  carrier: string;
  port_of_loading: string;
  port_of_discharge: string;
  shipper?: string;
  consignee?: string;
  notify_party?: string;
  container_no?: string;
  cargo_description?: string;
  total_packages?: number;
  package_type?: string;
  gross_weight_kg?: number;
  freight_terms?: string;
  issue_date?: string;
  status?: string;
}) {
  const newId = generateUUID();
  const blNo = bl.bl_number || `BL-${Math.floor(100000 + Math.random() * 900000)}`;
  const payload = {
    id: newId,
    bl_number: blNo,
    shipment_no: bl.shipment_no || '',
    vessel_name: bl.vessel_name,
    voyage_no: bl.voyage_no || 'VY-2026-088',
    carrier: bl.carrier,
    port_of_loading: bl.port_of_loading,
    port_of_discharge: bl.port_of_discharge,
    shipper: bl.shipper || 'FEREX Global Trade Operations Ltd',
    consignee: bl.consignee || 'Consignee Entity',
    notify_party: bl.notify_party || 'Same as Consignee',
    container_no: bl.container_no || '',
    cargo_description: bl.cargo_description || 'General Trade Cargo',
    total_packages: Number(bl.total_packages) || 48,
    package_type: bl.package_type || 'Standard Export Pallets',
    gross_weight_kg: Number(bl.gross_weight_kg) || 20000,
    freight_terms: bl.freight_terms || 'Freight Prepaid',
    issue_date: bl.issue_date || new Date().toISOString().split('T')[0],
    status: bl.status || 'Issued',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeBillsOfLading();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_bls', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_bills_of_lading').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Bill of Lading ${blNo} Issued`,
    description: `B/L issued on vessel ${payload.vessel_name} by ${payload.carrier}.`,
    category: 'Logistics',
  });

  window.dispatchEvent(new Event('ferex_trade_bls_change'));
  return payload;
}

export async function updateTradeBillOfLadingStatus(id: string, status: string) {
  const current = await getTradeBillsOfLading();
  const updated = current.map((item: any) =>
    (item.id === id || item.bl_number === id)
      ? { ...item, status, updated_at: new Date().toISOString() }
      : item
  );
  try { localStorage.setItem('ferex_trade_bls', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('trade_bills_of_lading')
      .update({ status, updated_at: new Date().toISOString() })
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

// ─── 6. PACKING LISTS ────────────────────────────────────────────────────────
export async function getTradePackingLists() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_packing_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_pls', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_pls');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_pls');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradePackingList(pl: {
  pl_number?: string;
  shipment_no: string;
  invoice_no?: string;
  buyer_name: string;
  cargo_description: string;
  package_type?: string;
  total_packages: number;
  gross_weight_kg: number;
  net_weight_kg: number;
  dimensions?: string;
  volume_cbm?: number;
  marks_numbers?: string;
}) {
  const newId = generateUUID();
  const plNo = pl.pl_number || `PL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    id: newId,
    pl_number: plNo,
    shipment_no: pl.shipment_no,
    invoice_no: pl.invoice_no || '',
    buyer_name: pl.buyer_name,
    cargo_description: pl.cargo_description,
    package_type: pl.package_type || 'Palletised Cargo Units',
    total_packages: Number(pl.total_packages) || 1,
    gross_weight_kg: Number(pl.gross_weight_kg) || 0,
    net_weight_kg: Number(pl.net_weight_kg) || 0,
    dimensions: pl.dimensions || '40ft Standard High Cube Container',
    volume_cbm: Number(pl.volume_cbm) || 65.0,
    marks_numbers: pl.marks_numbers || `FEREX/${pl.shipment_no}/2026`,
    container_status: 'Loaded & Sealed (Customs Inspected)',
    created_at: new Date().toISOString(),
  };

  const current = await getTradePackingLists();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_pls', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_packing_lists').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Packing Manifest ${plNo} Created`,
    description: `Packing list generated for ${payload.shipment_no} (${payload.total_packages} packages).`,
    category: 'Logistics',
  });

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

// ─── 7. CERTIFICATES & COMPLIANCE ────────────────────────────────────────────
export async function getTradeCertificates() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_certs', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_certs');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_certs');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradeCertificate(cert: {
  certificate_no?: string;
  shipment_no?: string;
  cert_type?: string;
  title: string;
  exporter?: string;
  importer?: string;
  authority: string;
  country: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  document_url?: string;
}) {
  const newId = generateUUID();
  const certNo = cert.certificate_no || `CRT-2026-${Math.floor(100 + Math.random() * 900)}`;
  const payload = {
    id: newId,
    certificate_no: certNo,
    shipment_no: cert.shipment_no || '',
    cert_type: cert.cert_type || 'Certificate of Origin (Non-Preferential)',
    title: cert.title,
    exporter: cert.exporter || 'FEREX Global Trade Operations Ltd',
    importer: cert.importer || 'Trade Partner Importer',
    authority: cert.authority,
    country: cert.country,
    issue_date: cert.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: cert.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: cert.status || 'Verified & Active',
    document_url: cert.document_url || '',
    created_at: new Date().toISOString(),
  };

  const current = await getTradeCertificates();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_certs', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_certificates').insert(payload); } catch {}
  
  // Auto-generate notification
  await createTradeNotification({
    title: `Trade Certificate ${certNo} Registered`,
    description: `${payload.title} authenticated by ${payload.authority}.`,
    category: 'Compliance',
  });

  window.dispatchEvent(new Event('ferex_trade_certs_change'));
  return payload;
}

export async function updateTradeCertificateStatus(id: string, status: string) {
  const current = await getTradeCertificates();
  const updated = current.map((c: any) =>
    (c.id === id || c.certificate_no === id)
      ? { ...c, status, updated_at: new Date().toISOString() }
      : c
  );
  try { localStorage.setItem('ferex_trade_certs', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_certificates').update({ status, updated_at: new Date().toISOString() }).or(`id.eq.${id},certificate_no.eq.${id}`);
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

// ─── 8. TRADE PAYMENTS & CASHFLOW LEDGER ──────────────────────────────────────
export async function getTradePayments() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_payments', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_payments');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_payments');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradePayment(pay: {
  transaction_ref?: string;
  partner_entity: string;
  invoice_no?: string;
  shipment_no?: string;
  lc_reference?: string;
  description: string;
  amount: number;
  currency?: string;
  bank_name?: string;
  account_no?: string;
  payment_type?: string;
  flow_type?: 'inbound' | 'outbound';
  status?: string;
  settlement_date?: string;
}) {
  const newId = generateUUID();
  const txRef = pay.transaction_ref || `TX-TRD-${Math.floor(1000 + Math.random() * 9000)}`;
  const flowType = pay.flow_type || 'inbound';
  const payAmount = Number(pay.amount) || 0;

  const payload = {
    id: newId,
    transaction_ref: txRef,
    partner_entity: pay.partner_entity,
    invoice_no: pay.invoice_no || '',
    shipment_no: pay.shipment_no || '',
    lc_reference: pay.lc_reference || '',
    description: pay.description,
    amount: payAmount,
    currency: pay.currency || 'INR',
    bank_name: pay.bank_name || 'HSBC London Trade Banking',
    account_no: pay.account_no || 'GB29HSBC40051512345678',
    payment_type: pay.payment_type || 'SWIFT Wire Transfer',
    flow_type: flowType,
    status: pay.status || 'Completed',
    settlement_date: pay.settlement_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const current = await getTradePayments();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_trade_payments', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_payments').insert(payload); } catch {}

  // Auto reconcile invoice if linked
  if (pay.invoice_no && flowType === 'inbound') {
    const invoices = await getTradeInvoices();
    const inv = invoices.find((i: any) => i.invoice_no === pay.invoice_no || i.id === pay.invoice_no);
    if (inv) {
      const currentPaid = Number(inv.amount_paid || 0);
      const invTotal = Number(inv.amount || 0);
      const newPaid = currentPaid + payAmount;
      const newOutstanding = Math.max(0, invTotal - newPaid);
      const newStatus = newOutstanding <= 0 ? 'Paid' : 'Partially Paid';
      
      await updateTradeInvoice(inv.id, {
        amount_paid: newPaid,
        outstanding_amount: newOutstanding,
        status: newStatus,
        payment_status: newStatus,
        paid_at: newStatus === 'Paid' ? new Date().toISOString() : inv.paid_at,
      });
    }
  }

  // Auto-generate notification
  await createTradeNotification({
    title: `Payment ${flowType === 'inbound' ? 'Received' : 'Disbursed'}: ₹${payAmount.toLocaleString('en-IN')}`,
    description: `${flowType === 'inbound' ? 'Inflow received from' : 'Outflow paid to'} ${payload.partner_entity} via ${payload.payment_type}. Ref: ${txRef}`,
    category: 'Payments',
  });

  window.dispatchEvent(new Event('ferex_trade_payments_change'));
  return payload;
}

export async function updateTradePaymentStatus(id: string, status: string) {
  const current = await getTradePayments();
  const updated = current.map((p: any) =>
    (p.id === id || p.transaction_ref === id)
      ? { ...p, status, updated_at: new Date().toISOString() }
      : p
  );
  try { localStorage.setItem('ferex_trade_payments', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_payments').update({ status, updated_at: new Date().toISOString() }).or(`id.eq.${id},transaction_ref.eq.${id}`);
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

// ─── 9. TRADE DOCUMENTS VAULT ────────────────────────────────────────────────
export async function getTradeDocuments() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
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
  shipment_no?: string;
  invoice_no?: string;
  partner_name?: string;
  document_url?: string;
  is_verified?: boolean;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    document_name: doc.document_name,
    folder: doc.folder || 'Commercial Invoices',
    file_size: doc.file_size || '1.8 MB',
    doc_type: doc.doc_type || 'Commercial Invoice',
    shipment_no: doc.shipment_no || '',
    invoice_no: doc.invoice_no || '',
    partner_name: doc.partner_name || 'FEREX Global Trade Operations',
    document_url: doc.document_url || '',
    is_verified: doc.is_verified ?? true,
    verification_status: doc.is_verified ? 'Verified' : 'Pending Review',
    uploaded_by: 'Authorized Trade Operator',
    uploaded_at: new Date().toISOString(),
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

  // Auto-generate notification
  await createTradeNotification({
    title: `Trade Document Uploaded: ${payload.document_name}`,
    description: `Uploaded into ${payload.folder} for ${payload.partner_name}.`,
    category: 'Documents',
  });

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

// ─── 10. TRADE MESSAGES & NOTIFICATIONS ──────────────────────────────────────
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
    contact_role: msg.contact_role || 'Operations Officer',
    sender_name: msg.sender_name || 'Trade Director',
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString(),
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

export async function getTradeNotifications() {
  initSeedData();
  try {
    const { data, error } = await supabase
      .from('trade_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_notifs', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_notifs');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_trade_notifs');
    if (local) {
      try { return JSON.parse(local); } catch {}
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
    created_at: new Date().toISOString(),
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

// ─── 11. DYNAMIC LIVE TRADE DASHBOARD STATS ──────────────────────────────────
export async function getTradeDashboardLiveStats() {
  try {
    const [shipments, invoices, lcs, payments] = await Promise.all([
      getTradeShipments(),
      getTradeInvoices(),
      getTradeLettersOfCredit(),
      getTradePayments(),
    ]);

    const activeShipments = shipments.filter((s: any) =>
      s.status !== 'Delivered' && s.status !== 'Closed' && s.shipment_status !== 'Delivered'
    );
    const totalVolume = invoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const openLCsAmount = lcs.filter((l: any) => l.status !== 'Settled' && l.status !== 'Expired').reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
    const clearedPaymentsAmount = payments.filter((p: any) => (p.status === 'Completed' || p.status === 'Cleared') && p.flow_type === 'inbound').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

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

// ─── 12. TRADE DOSSIER & CROSS-LOOKUP UTILITY ─────────────────────────────────
export async function getTradeDossier(entityType: string, entityId: string) {
  const [partners, shipments, invoices, packingLists, bls, certs, lcs, payments, docs] = await Promise.all([
    getTradeCRMContacts(),
    getTradeShipments(),
    getTradeInvoices(),
    getTradePackingLists(),
    getTradeBillsOfLading(),
    getTradeCertificates(),
    getTradeLettersOfCredit(),
    getTradePayments(),
    getTradeDocuments(),
  ]);

  const cleanId = (entityId || '').toLowerCase();

  return {
    partner: partners.find((p: any) => p.id?.toLowerCase() === cleanId || p.company_name?.toLowerCase() === cleanId || p.name?.toLowerCase() === cleanId) || null,
    shipments: shipments.filter((s: any) => s.id?.toLowerCase() === cleanId || s.shipment_no?.toLowerCase() === cleanId || s.partner_name?.toLowerCase().includes(cleanId) || s.partner_id?.toLowerCase() === cleanId),
    invoices: invoices.filter((i: any) => i.id?.toLowerCase() === cleanId || i.invoice_no?.toLowerCase() === cleanId || i.shipment_no?.toLowerCase() === cleanId || i.buyer_name?.toLowerCase().includes(cleanId)),
    packingLists: packingLists.filter((p: any) => p.id?.toLowerCase() === cleanId || p.pl_number?.toLowerCase() === cleanId || p.shipment_no?.toLowerCase() === cleanId || p.invoice_no?.toLowerCase() === cleanId),
    billsOfLading: bls.filter((b: any) => b.id?.toLowerCase() === cleanId || b.bl_number?.toLowerCase() === cleanId || b.shipment_no?.toLowerCase() === cleanId || b.consignee?.toLowerCase().includes(cleanId)),
    certificates: certs.filter((c: any) => c.id?.toLowerCase() === cleanId || c.certificate_no?.toLowerCase() === cleanId || c.shipment_no?.toLowerCase() === cleanId),
    lettersOfCredit: lcs.filter((l: any) => l.id?.toLowerCase() === cleanId || l.lc_number?.toLowerCase() === cleanId || l.applicant?.toLowerCase().includes(cleanId) || l.beneficiary?.toLowerCase().includes(cleanId) || l.shipment_no?.toLowerCase() === cleanId),
    payments: payments.filter((p: any) => p.id?.toLowerCase() === cleanId || p.transaction_ref?.toLowerCase() === cleanId || p.invoice_no?.toLowerCase() === cleanId || p.shipment_no?.toLowerCase() === cleanId || p.partner_entity?.toLowerCase().includes(cleanId)),
    documents: docs.filter((d: any) => d.id?.toLowerCase() === cleanId || d.shipment_no?.toLowerCase() === cleanId || d.invoice_no?.toLowerCase() === cleanId || d.partner_name?.toLowerCase().includes(cleanId) || d.document_name?.toLowerCase().includes(cleanId)),
  };
}

// ─── 13. GLOBAL CROSS-MODULE SEARCH ──────────────────────────────────────────
export async function globalSearchTrade(query: string) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  const [partners, shipments, invoices, packingLists, bls, certs, lcs, payments, docs] = await Promise.all([
    getTradeCRMContacts(),
    getTradeShipments(),
    getTradeInvoices(),
    getTradePackingLists(),
    getTradeBillsOfLading(),
    getTradeCertificates(),
    getTradeLettersOfCredit(),
    getTradePayments(),
    getTradeDocuments(),
  ]);

  const results: any[] = [];

  // Partners
  partners.forEach((p: any) => {
    if (p.company_name?.toLowerCase().includes(q) || p.contact?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) {
      results.push({
        id: p.id,
        category: 'Trade Partner (CRM)',
        title: p.company_name || p.name,
        subtitle: `${p.category || 'Partner'} • ${p.country || 'Global'} • Contact: ${p.contact || 'N/A'}`,
        path: '/trade/crm',
        raw: p,
      });
    }
  });

  // Shipments
  shipments.forEach((s: any) => {
    if (s.shipment_no?.toLowerCase().includes(q) || s.container_no?.toLowerCase().includes(q) || s.carrier?.toLowerCase().includes(q) || s.cargo_description?.toLowerCase().includes(q) || s.origin_port?.toLowerCase().includes(q) || s.destination_port?.toLowerCase().includes(q)) {
      results.push({
        id: s.shipment_no || s.id,
        category: 'Shipment',
        title: `${s.shipment_no || s.id} — ${s.carrier || 'Ocean Liner'}`,
        subtitle: `${s.origin_port || 'POL'} ➔ ${s.destination_port || 'POD'} • ${s.status || 'Active'}`,
        path: '/trade/shipments',
        raw: s,
      });
    }
  });

  // Invoices
  invoices.forEach((i: any) => {
    if (i.invoice_no?.toLowerCase().includes(q) || i.buyer_name?.toLowerCase().includes(q) || i.shipment_no?.toLowerCase().includes(q)) {
      results.push({
        id: i.invoice_no || i.id,
        category: 'Commercial Invoice',
        title: `${i.invoice_no || i.id} — ₹${Number(i.amount || 0).toLocaleString('en-IN')}`,
        subtitle: `Buyer: ${i.buyer_name} • Status: ${i.status || 'Issued'} • Due: ${i.due_date || 'N/A'}`,
        path: '/trade/invoices',
        raw: i,
      });
    }
  });

  // Bills of Lading
  bls.forEach((b: any) => {
    if (b.bl_number?.toLowerCase().includes(q) || b.vessel_name?.toLowerCase().includes(q) || b.carrier?.toLowerCase().includes(q) || b.consignee?.toLowerCase().includes(q)) {
      results.push({
        id: b.bl_number || b.id,
        category: 'Bill of Lading',
        title: `${b.bl_number || b.id} — ${b.carrier || 'Carrier'}`,
        subtitle: `Vessel: ${b.vessel_name} • Consignee: ${b.consignee} • Status: ${b.status || 'Issued'}`,
        path: '/trade/bills-of-lading',
        raw: b,
      });
    }
  });

  // Letters of Credit
  lcs.forEach((l: any) => {
    if (l.lc_number?.toLowerCase().includes(q) || l.applicant?.toLowerCase().includes(q) || l.issuing_bank?.toLowerCase().includes(q) || l.beneficiary?.toLowerCase().includes(q)) {
      results.push({
        id: l.lc_number || l.id,
        category: 'Letter of Credit',
        title: `${l.lc_number || l.id} — ₹${Number(l.amount || 0).toLocaleString('en-IN')}`,
        subtitle: `Issuing Bank: ${l.issuing_bank} • Applicant: ${l.applicant} • Status: ${l.status || 'Issued'}`,
        path: '/trade/letters-of-credit',
        raw: l,
      });
    }
  });

  // Payments
  payments.forEach((p: any) => {
    if (p.transaction_ref?.toLowerCase().includes(q) || p.partner_entity?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
      results.push({
        id: p.transaction_ref || p.id,
        category: 'Trade Payment',
        title: `${p.transaction_ref || p.id} — ₹${Number(p.amount || 0).toLocaleString('en-IN')} (${p.flow_type === 'inbound' ? 'Inflow' : 'Outflow'})`,
        subtitle: `Partner: ${p.partner_entity} • Method: ${p.payment_type} • Status: ${p.status || 'Completed'}`,
        path: '/trade/payments',
        raw: p,
      });
    }
  });

  // Documents
  docs.forEach((d: any) => {
    if (d.document_name?.toLowerCase().includes(q) || d.doc_type?.toLowerCase().includes(q) || d.folder?.toLowerCase().includes(q)) {
      results.push({
        id: d.id,
        category: 'Vault Document',
        title: d.document_name,
        subtitle: `${d.doc_type || 'Document'} • Folder: ${d.folder || 'Vault'} • ${d.file_size || '1.0 MB'}`,
        path: '/trade/documents',
        raw: d,
      });
    }
  });

  // Packing Lists
  packingLists.forEach((pl: any) => {
    if (pl.pl_number?.toLowerCase().includes(q) || pl.shipment_no?.toLowerCase().includes(q) || pl.buyer_name?.toLowerCase().includes(q)) {
      results.push({
        id: pl.pl_number || pl.id,
        category: 'Packing Manifest',
        title: `${pl.pl_number || pl.id} — ${pl.total_packages || 0} Pkgs`,
        subtitle: `Shipment: ${pl.shipment_no} • Buyer: ${pl.buyer_name} • Weight: ${Number(pl.gross_weight_kg || 0).toLocaleString()} kg`,
        path: '/trade/packing-lists',
        raw: pl,
      });
    }
  });

  // Certificates
  certs.forEach((c: any) => {
    if (c.certificate_no?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q) || c.authority?.toLowerCase().includes(q)) {
      results.push({
        id: c.certificate_no || c.id,
        category: 'Certificate',
        title: `${c.certificate_no || c.id} — ${c.title}`,
        subtitle: `Authority: ${c.authority} • Status: ${c.status || 'Active'}`,
        path: '/trade/certificates',
        raw: c,
      });
    }
  });

  return results.slice(0, 15);
}

// ─── 14. CREDENTIAL PROVISIONING ─────────────────────────────────────────────
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

  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'trade_client',
    fullName: fullName,
    full_name: fullName,
    company_name: companyName,
    partner_id: partner.id,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_trade_partner_cred_${partner.id}`, JSON.stringify(credentialPayload));

  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'trade_client',
      full_name: fullName,
      phone: '',
      department: `Trade:${companyName}`,
      must_change_password: true,
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

// ─── 15. CUSTOMS BONDED WAREHOUSE & CARGO LOSSES ──────────────────────────────
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
  try {
    const { data, error } = await supabase
      .from('trade_bonded_inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_bonded_inventory');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    
    // Default seed
    const seed: BondedCargoItem[] = [
      {
        id: 'BOND-001',
        sku: 'SKU-WHEAT-PL01',
        commodity: 'Milling Wheat Grade A',
        category: 'Agricultural Grains',
        port_location: 'Port of Gdansk, Poland',
        warehouse_bay: 'Silo Bay 04-East',
        in_stock_metric_tons: 1450,
        reserved_metric_tons: 350,
        available_metric_tons: 1100,
        unit_value_inr: 28500,
        total_valuation_inr: 41325000,
        customs_bond_no: 'BOND-PL-GDN-8821',
        status: 'In Bond',
        last_inspected_at: '2026-09-08',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'BOND-002',
        sku: 'SKU-STEEL-DE02',
        commodity: 'Cold Rolled Steel Coils DC01',
        category: 'Metals & Metallurgy',
        port_location: 'Port of Hamburg, Germany',
        warehouse_bay: 'Covered Bay 12-North',
        in_stock_metric_tons: 680,
        reserved_metric_tons: 120,
        available_metric_tons: 560,
        unit_value_inr: 68000,
        total_valuation_inr: 46240000,
        customs_bond_no: 'BOND-DE-HAM-9941',
        status: 'Cleared Customs',
        last_inspected_at: '2026-09-04',
        updated_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(seed));
    return seed;
  } catch {
    const local = localStorage.getItem('ferex_trade_bonded_inventory');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradeBondedItem(item: Partial<BondedCargoItem>): Promise<BondedCargoItem> {
  const current = await getTradeBondedInventory();
  const inStock = Number(item.in_stock_metric_tons) || 0;
  const reserved = Number(item.reserved_metric_tons) || 0;
  const unitVal = Number(item.unit_value_inr) || 0;
  const created: BondedCargoItem = {
    id: generateUUID(),
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
  try { localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_bonded_inventory').insert(created); } catch {}
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return created;
}

export async function updateTradeBondedStock(id: string, updates: Partial<BondedCargoItem>) {
  const current = await getTradeBondedInventory();
  const updated = current.map(item => {
    if (item.id === id || item.sku === id) {
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
  try { localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('trade_bonded_inventory').update({ ...updates, updated_at: new Date().toISOString() }).or(`id.eq.${id},sku.eq.${id}`);
  } catch {}
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return true;
}

export async function deleteTradeBondedItem(id: string) {
  const current = await getTradeBondedInventory();
  const filtered = current.filter(item => item.id !== id && item.sku !== id);
  try { localStorage.setItem('ferex_trade_bonded_inventory', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_bonded_inventory').delete().or(`id.eq.${id},sku.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_bonded_inventory_change'));
  return true;
}

export interface CargoLossRecord {
  id: string;
  incident_ref: string;
  shipment_no: string;
  container_no: string;
  loss_type: 'Shrinkage & Moisture Loss' | 'Demurrage & Detention Fine' | 'Transit Damage' | 'Port Delay Deterioration' | 'Customs Penalty';
  cargo_description: string;
  lost_quantity_metric_tons: number;
  direct_financial_loss_inr: number;
  demurrage_incurred_inr: number;
  insurance_claim_status: 'Not Filed' | 'Claim Lodged' | 'Under Investigation' | 'Settled & Recovered' | 'Rejected';
  recovered_amount_inr: number;
  incident_date: string;
  port_or_location: string;
  root_cause: string;
  created_at: string;
}

export async function getTradeCargoLosses(): Promise<CargoLossRecord[]> {
  try {
    const { data, error } = await supabase
      .from('trade_cargo_losses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_trade_cargo_losses');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    
    // Default seed
    const seed: CargoLossRecord[] = [
      {
        id: 'LOSS-001',
        incident_ref: 'INC-2026-GDN-04',
        shipment_no: 'SHP-9821',
        container_no: 'MSCU-902184-7',
        loss_type: 'Demurrage & Detention Fine',
        cargo_description: 'Agricultural Milling Wheat Grade-A',
        lost_quantity_metric_tons: 0,
        direct_financial_loss_inr: 0,
        demurrage_incurred_inr: 32000,
        insurance_claim_status: 'Claim Lodged',
        recovered_amount_inr: 0,
        incident_date: '2026-09-06',
        port_or_location: 'Port of Gdansk, Poland',
        root_cause: 'Berth congestion and customs server downtime causing 48-hour container detention',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(seed));
    return seed;
  } catch {
    const local = localStorage.getItem('ferex_trade_cargo_losses');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createTradeCargoLoss(loss: Partial<CargoLossRecord>): Promise<CargoLossRecord> {
  const current = await getTradeCargoLosses();
  const created: CargoLossRecord = {
    id: generateUUID(),
    incident_ref: loss.incident_ref || `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    shipment_no: loss.shipment_no || 'SHP-9821',
    container_no: loss.container_no || 'MSCU-902184-7',
    loss_type: loss.loss_type || 'Demurrage & Detention Fine',
    cargo_description: loss.cargo_description || 'Bulk Grain / Cargo',
    lost_quantity_metric_tons: Number(loss.lost_quantity_metric_tons) || 0,
    direct_financial_loss_inr: Number(loss.direct_financial_loss_inr) || 0,
    demurrage_incurred_inr: Number(loss.demurrage_incurred_inr) || 0,
    insurance_claim_status: loss.insurance_claim_status || 'Claim Lodged',
    recovered_amount_inr: Number(loss.recovered_amount_inr) || 0,
    incident_date: loss.incident_date || new Date().toISOString().split('T')[0],
    port_or_location: loss.port_or_location || 'Port of Gdansk, Poland',
    root_cause: loss.root_cause || 'Operational delay during maritime transit',
    created_at: new Date().toISOString(),
  };
  const updated = [created, ...current];
  try { localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(updated)); } catch {}
  try { await supabase.from('trade_cargo_losses').insert(created); } catch {}
  window.dispatchEvent(new Event('ferex_trade_cargo_losses_change'));
  return created;
}

export async function deleteTradeCargoLoss(id: string) {
  const current = await getTradeCargoLosses();
  const filtered = current.filter(item => item.id !== id && item.incident_ref !== id);
  try { localStorage.setItem('ferex_trade_cargo_losses', JSON.stringify(filtered)); } catch {}
  try { await supabase.from('trade_cargo_losses').delete().or(`id.eq.${id},incident_ref.eq.${id}`); } catch {}
  window.dispatchEvent(new Event('ferex_trade_cargo_losses_change'));
  return true;
}

export async function getTradeCargoLossSummary() {
  const losses = await getTradeCargoLosses();
  const totalLossInr = losses.reduce((sum, l) => sum + (Number(l.direct_financial_loss_inr) || 0), 0);
  const totalDemurrageInr = losses.reduce((sum, l) => sum + (Number(l.demurrage_incurred_inr) || 0), 0);
  const totalShrinkageTons = losses.reduce((sum, l) => sum + (Number(l.lost_quantity_metric_tons) || 0), 0);
  const recoveredInr = losses.reduce((sum, l) => sum + (Number(l.recovered_amount_inr) || 0), 0);

  return {
    totalLossInr,
    totalDemurrageInr,
    totalShrinkageTons,
    recoveredInr,
    totalLossesCount: losses.length,
  };
}
