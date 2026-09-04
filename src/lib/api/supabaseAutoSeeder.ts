import { supabase } from '../supabase';
import { getSystemFeeConfig, DEFAULT_FEE_CONFIG } from './feeConfig';

export async function autoSeedAllDataToSupabase() {
  // Sync system fee configuration if not set
  try {
    const feeConfig = getSystemFeeConfig() || DEFAULT_FEE_CONFIG;
    await supabase.from('system_config').upsert({
      key: 'fee_config',
      value: feeConfig,
      updated_at: new Date().toISOString()
    });
  } catch (err: any) {}

  // Permanent seed guard: if the database has already completed initial bootstrap,
  // NEVER re-seed dummy rows when a user deletes table records!
  const localSeeded = typeof window !== 'undefined' && localStorage.getItem('ferex_divisions_seeded_v1') === 'true';
  if (localSeeded) return;

  try {
    const { data: configRow } = await supabase.from('system_config').select('value').eq('key', 'ferex_divisions_seeded_v1').maybeSingle();
    if (configRow) {
      try { localStorage.setItem('ferex_divisions_seeded_v1', 'true'); } catch {}
      return;
    }
  } catch {}

  // Mark as seeded in both localStorage and Supabase system_config
  try { localStorage.setItem('ferex_divisions_seeded_v1', 'true'); } catch {}
  try {
    await supabase.from('system_config').upsert({
      key: 'ferex_divisions_seeded_v1',
      value: { seeded_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    });
  } catch {}

  try {
    const { count } = await supabase.from('trade_clients').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_clients').insert([
        {
          company_name: 'Warsaw Global Logistics Sp. z o.o.',
          country: 'Poland',
          contact_person: 'Jan Kowalski',
          email: 'j.kowalski@warsawlogistics.pl',
          phone: '+48 22 890 1234',
          category: 'Freight Forwarder',
          payment_terms: 'LC 60 Days',
          status: 'Active'
        },
        {
          company_name: 'Berlin Industrial Supplies GmbH',
          country: 'Germany',
          contact_person: 'Hans Weber',
          email: 'h.weber@berlin-supplies.de',
          phone: '+49 30 554 9912',
          category: 'Buyer',
          payment_terms: 'CIF Rotterdam',
          status: 'Active'
        },
        {
          company_name: 'Rotterdam Maritime Trading N.V.',
          country: 'Netherlands',
          contact_person: 'Anouk de Jong',
          email: 'a.dejong@rotterdamtrade.nl',
          phone: '+31 10 442 8870',
          category: 'Logistics Partner',
          payment_terms: 'DDP Antwerp',
          status: 'Active'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Shipments exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_shipments').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_shipments').insert([
        {
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
          etd: '2026-09-02'
        },
        {
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
          etd: '2026-09-04'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Invoices exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_invoices').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_invoices').insert([
        {
          invoice_no: 'INV-TRD-40101',
          buyer_name: 'Berlin Industrial Supplies GmbH',
          incoterms: 'CIF Rotterdam',
          amount: 4250000,
          currency: 'INR',
          payment_terms: 'Letter of Credit (LC) at Sight',
          status: 'Paid',
          payment_status: 'Paid',
          due_date: '2026-09-28'
        },
        {
          invoice_no: 'INV-TRD-40102',
          buyer_name: 'Warsaw Global Logistics Sp. z o.o.',
          incoterms: 'FOB Gdansk',
          amount: 1820000,
          currency: 'INR',
          payment_terms: 'SWIFT Wire (Net 30)',
          status: 'Issued',
          payment_status: 'Issued',
          due_date: '2026-10-01'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Letters of Credit exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_letters_of_credit').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_letters_of_credit').insert([
        {
          lc_number: 'LC-2026-8810',
          issuing_bank: 'HSBC London / Warsaw Desk',
          beneficiary: 'Warsaw Global Logistics Sp. z o.o.',
          applicant: 'Ferex Global Trade Corp',
          amount: 14500000,
          currency: 'INR',
          status: 'Active & Confirmed',
          expiry_date: '2026-10-30'
        },
        {
          lc_number: 'LC-2026-8811',
          issuing_bank: 'Deutsche Bank Frankfurt Desk',
          beneficiary: 'Berlin Industrial Supplies GmbH',
          applicant: 'Ferex Global Trade Corp',
          amount: 21000000,
          currency: 'INR',
          status: 'Under Banking Verification',
          expiry_date: '2026-11-15'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Bills of Lading exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_bills_of_lading').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_bills_of_lading').insert([
        {
          bl_number: 'BL-992014',
          vessel_name: 'MSC Oscar (V.8821)',
          carrier: 'MSC Mediterranean Shipping Co.',
          port_of_loading: 'Port of Gdansk 🇵🇱',
          port_of_discharge: 'Port of Rotterdam 🇳🇱',
          shipper: 'Ferex Global Trade Corp',
          consignee: 'Warsaw Global Logistics Sp. z o.o.',
          status: 'Clean On-Board Signed'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Packing Lists exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_packing_lists').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_packing_lists').insert([
        {
          pl_number: 'PL-2026-401',
          shipment_no: 'SHP-9821',
          buyer_name: 'Berlin Industrial Supplies GmbH',
          cargo_description: 'High-Precision Industrial Bearing Assemblies (48 Crates)',
          total_packages: 48,
          gross_weight_kg: 24500,
          net_weight_kg: 22800,
          container_status: 'Loaded & Sealed (Customs Inspected)'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Certificates exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_certificates').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_certificates').insert([
        {
          certificate_no: 'CRT-2026-901',
          title: 'EU Certificate of Origin (Form A)',
          authority: 'Chamber of Commerce Warsaw',
          country: 'Poland 🇵🇱',
          status: 'Verified & Active',
          expiry_date: '2027-07-10'
        },
        {
          certificate_no: 'CRT-2026-902',
          title: 'Phytosanitary Export Inspection Certificate',
          authority: 'Federal Ministry of Agriculture Berlin',
          country: 'Germany 🇩🇪',
          status: 'Verified & Active',
          expiry_date: '2027-01-22'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Payments exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_payments').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_payments').insert([
        {
          transaction_ref: 'TX-TRD-9001',
          partner_entity: 'Warsaw Global Logistics Sp. z o.o.',
          description: 'Port Clearance & Customs Fee',
          amount: 1820000,
          currency: 'INR',
          payment_type: 'SWIFT Wire Transfer',
          status: 'Completed',
          settlement_date: '2026-08-28'
        },
        {
          transaction_ref: 'TX-TRD-9002',
          partner_entity: 'Berlin Industrial Supplies GmbH',
          description: 'Machinery Export Batch #4',
          amount: 4250000,
          currency: 'INR',
          payment_type: 'LC Settlement',
          status: 'Completed',
          settlement_date: '2026-09-01'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Notifications exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_notifications').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_notifications').insert([
        {
          title: 'Container MSKU-9821 Arrived at Port',
          description: 'Customs gate-out clearance confirmed at Port of Rotterdam.',
          category: 'Logistics',
          is_read: false,
          is_archived: false
        },
        {
          title: 'LC-2026-8810 Approved by HSBC Bank',
          description: 'Irrevocable LC valued at ₹1.45 Cr authorized.',
          category: 'Banking',
          is_read: false,
          is_archived: false
        }
      ]);
    }
  } catch (e) {}

  // Ensure Rimi Admin User exists in public.users
  try {
    await supabase.from('users').upsert({
      email: 'rimi@ferex.com',
      role: 'rimi_admin',
      full_name: 'Rimi Cold Chain Manager',
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch (e) {}

  // Ensure initial Rimi Distributors / Retailers exist in Supabase DB
  try {
    const { count } = await supabase.from('rimi_distributors').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('rimi_distributors').insert([
        {
          business_name: 'HyperCity Supermarkets Mumbai Hub',
          contact_person: 'Rajesh Sharma',
          tier: 'Retailer',
          territory: 'Mumbai Central / Western',
          email: 'procurement@hypercity-retail.in',
          phone: '+91 98200 11223',
          credit_limit: 1500000.00,
          outstanding_balance: 245000.00,
          status: 'Active'
        },
        {
          business_name: 'Royal Ocean HORECA Wholesale Ltd',
          contact_person: 'Vikram Mehta',
          tier: 'Wholesaler',
          territory: 'South Maharashtra / APMC Navi Mumbai',
          email: 'v.mehta@royaloceanhoreca.com',
          phone: '+91 98190 44556',
          credit_limit: 3500000.00,
          outstanding_balance: 620000.00,
          status: 'Active'
        },
        {
          business_name: 'Gourmet Freeze Express Distributors',
          contact_person: 'Pooja Nair',
          tier: 'Distributor',
          territory: 'Pune & Konkan Coastal Route',
          email: 'pooja.nair@gourmetfreeze.com',
          phone: '+91 98230 77889',
          credit_limit: 5000000.00,
          outstanding_balance: 1250000.00,
          status: 'Active'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Rimi Products exist in Supabase DB
  try {
    const { count } = await supabase.from('rimi_products').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('rimi_products').insert([
        {
          sku: 'RIMI-SF-001',
          name: 'Premium King Prawns (500g IQF)',
          category: 'Frozen Seafood',
          unit: 'KG',
          unit_price: 680.00,
          storage_temp: '-18°C',
          min_stock_alert: 50,
          is_active: true
        },
        {
          sku: 'RIMI-MT-002',
          name: 'Gourmet Chicken Nuggets (1kg Family Pack)',
          category: 'Processed Food',
          unit: 'Pack',
          unit_price: 340.00,
          storage_temp: '-18°C',
          min_stock_alert: 100,
          is_active: true
        },
        {
          sku: 'RIMI-VG-003',
          name: 'Sweet Corn & Green Peas IQF (1kg)',
          category: 'Frozen Vegetables',
          unit: 'KG',
          unit_price: 180.00,
          storage_temp: '-18°C',
          min_stock_alert: 80,
          is_active: true
        },
        {
          sku: 'RIMI-DY-004',
          name: 'Belgian Dark Chocolate Ice Cream Tub (2L)',
          category: 'Ice Cream & Dairy',
          unit: 'Box',
          unit_price: 520.00,
          storage_temp: '-22°C',
          min_stock_alert: 40,
          is_active: true
        }
      ]);
    }
  } catch (e) {}

  // Ensure Ferex Digital Admin User exists in public.users
  try {
    await supabase.from('users').upsert({
      email: 'digital@ferex.com',
      role: 'digital_admin',
      full_name: 'Ferex Digital Director',
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch (e) {}

  // Ensure initial Digital Clients exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_clients').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_clients').insert([
        {
          company_name: 'Nexus FinTech Global',
          contact_person: 'Ananya Deshmukh',
          email: 'ananya@nexusfintech.io',
          phone: '+91 98190 33445',
          industry: 'Fintech & Banking',
          status: 'Active',
          total_revenue: 1450000.00
        },
        {
          company_name: 'Starlight E-Commerce Brands',
          contact_person: 'Rahul Varma',
          email: 'rahul@starlightbrands.com',
          phone: '+91 98200 66778',
          industry: 'Retail & E-Commerce',
          status: 'Active',
          total_revenue: 820000.00
        },
        {
          company_name: 'AeroCloud SaaS Platforms',
          contact_person: 'David Miller',
          email: 'dmiller@aerocloud.net',
          phone: '+1 415 890 1200',
          industry: 'Cloud Software',
          status: 'Active',
          total_revenue: 2100000.00
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Digital Projects exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_projects').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_projects').insert([
        {
          title: 'Nexus NeoBanking Web & Mobile Platform',
          service_category: 'Web & App Development',
          status: 'In Progress',
          budget: 1450000.00,
          progress: 68,
          deadline: '2026-10-15',
          lead_developer: 'Kavita Iyer'
        },
        {
          title: 'Starlight Multi-Brand Design System & UI/UX',
          service_category: 'UI/UX Design',
          status: 'In Progress',
          budget: 820000.00,
          progress: 45,
          deadline: '2026-09-30',
          lead_developer: 'Sameer Sen'
        },
        {
          title: 'AeroCloud Global SEO & Growth Marketing',
          service_category: 'SEO & Performance',
          status: 'In Progress',
          budget: 650000.00,
          progress: 80,
          deadline: '2026-11-01',
          lead_developer: 'Pooja Hegde'
        }
      ]);
    }
  } catch (e) {}
}
