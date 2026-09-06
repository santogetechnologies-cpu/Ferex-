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

    // Seed Stripe & UPI payment gateways config if not present
    const { data: gwData } = await supabase.from('system_config').select('value').eq('key', 'payment_gateways').maybeSingle();
    if (!gwData) {
      const defaultGateways = {
        stripe: {
          enabled: true,
          publishableKey: 'pk_test_51MzDemoKeyFerexGlobalEnterprise99420StripePublishableKey',
          secretKey: 'sk_test_51MzDemoSecretKeyFerexGlobalEnterprise99420StripeSecretKey',
          webhookSecret: 'whsec_demoWebhookSecretFerex2026',
          environment: 'sandbox',
          supportedCurrencies: ['INR', 'EUR', 'USD'],
          defaultCurrency: 'INR',
          autoCapture: true,
        },
        upi: {
          enabled: true,
          upiId: 'ferex.payments@icici',
          merchantName: 'FEREX ENTERPRISE GROUP',
          merchantCode: '5411',
          qrCodeEnabled: true,
          collectRequestEnabled: true,
          autoVerifyUtr: true,
        },
        divisions: {
          education: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.education@icici', customMerchantName: 'FEREX GLOBAL EDUCATION' },
          digital: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.digital@icici', customMerchantName: 'FEREX DIGITAL ERP' },
          rimi: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.rimi@icici', customMerchantName: 'RIMI FROZEN LOGISTICS' },
          trade: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.trade@icici', customMerchantName: 'FEREX GLOBAL TRADE' },
        },
        updated_at: new Date().toISOString(),
        updated_by: 'System AutoSeeder',
      };
      await supabase.from('system_config').upsert({
        key: 'payment_gateways',
        value: defaultGateways,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {}

  // Per-table initialization: checks count for each table individually
  // so if any new table or empty division needs initial baseline records, it gracefully populates it without overwriting anything.

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

  // Ensure initial Trade Bonded Inventory exists in Supabase DB
  try {
    const { count } = await supabase.from('trade_bonded_inventory').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_bonded_inventory').insert([
        {
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
          status: 'In Bond'
        },
        {
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
          status: 'In Bond'
        },
        {
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
          status: 'Cleared Customs'
        },
        {
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
          status: 'In Bond'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Digital Invoices exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_invoices').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_invoices').insert([
        {
          invoice_no: 'INV-DIG-8841',
          amount: 1450000.00,
          tax_amount: 261000.00,
          currency: 'INR',
          status: 'Paid',
          due_date: '2026-08-15'
        },
        {
          invoice_no: 'INV-DIG-8842',
          amount: 680000.00,
          tax_amount: 122400.00,
          currency: 'INR',
          status: 'Paid',
          due_date: '2026-08-28'
        },
        {
          invoice_no: 'INV-DIG-8843',
          amount: 725000.00,
          tax_amount: 130500.00,
          currency: 'INR',
          status: 'Sent',
          due_date: '2026-09-25'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Rimi Warehouses exist in Supabase DB
  try {
    const { count } = await supabase.from('rimi_warehouses').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('rimi_warehouses').insert([
        {
          code: 'WH-MUM-01',
          name: 'Mumbai Central Deep Freeze Hub',
          city: 'Navi Mumbai',
          address: 'APMC Logistics Corridor, Sector 19',
          cold_room_temp_celsius: -22.40,
          total_capacity_pallets: 1200,
          utilized_pallets: 1056,
          manager_name: 'Rajesh Sharma',
          manager_phone: '+91 98200 44556'
        },
        {
          code: 'WH-DEL-02',
          name: 'Delhi NCR Reefer Logistics Center',
          city: 'Gurugram',
          address: 'Cyber City Expressway Cold Park',
          cold_room_temp_celsius: -20.10,
          total_capacity_pallets: 850,
          utilized_pallets: 544,
          manager_name: 'Amit Verma',
          manager_phone: '+91 98200 44557'
        },
        {
          code: 'WH-BLR-03',
          name: 'Bengaluru South Cold Transit Depot',
          city: 'Bengaluru',
          address: 'Electronic City Phase II Depot',
          cold_room_temp_celsius: -18.80,
          total_capacity_pallets: 600,
          utilized_pallets: 432,
          manager_name: 'K. Sunderam',
          manager_phone: '+91 98200 44558'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Digital Employees exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_employees').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_employees').insert([
        {
          name: 'Kavita Iyer',
          role: 'Principal Fullstack Architect',
          department: 'Engineering',
          email: 'k.iyer@ferex.digital',
          status: 'Active',
          rating: 9.6,
          kpiScore: 98,
          feedback: 'Architected high-throughput microservices and Next.js frontend with zero downtime.'
        },
        {
          name: 'Sameer Sen',
          role: 'Lead Product Designer (UI/UX)',
          department: 'Design',
          email: 's.sen@ferex.digital',
          status: 'Active',
          rating: 9.4,
          kpiScore: 96,
          feedback: 'Created tokenized design system adopted across mobile and web platforms.'
        },
        {
          name: 'Pooja Hegde',
          role: 'Senior SEO & Growth Strategist',
          department: 'Marketing',
          email: 'p.hegde@ferex.digital',
          status: 'Active',
          rating: 9.1,
          kpiScore: 93,
          feedback: 'Drove 140% surge in organic traffic and achieved Page #1 rankings.'
        },
        {
          name: 'Rohan Joshi',
          role: 'Mobile Flutter Engineer',
          department: 'Engineering',
          email: 'r.joshi@ferex.digital',
          status: 'Active',
          rating: 8.9,
          kpiScore: 91,
          feedback: 'Implemented smooth animations and cross-platform push notification pipelines.'
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Digital Assets exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_assets').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_assets').insert([
        {
          name: 'AWS Elastic Kubernetes (EKS Production Cluster)',
          type: 'Cloud Infrastructure',
          provider: 'Amazon Web Services',
          cost_per_month_inr: 88500,
          renewal_date: '2026-10-01',
          status: 'Active',
          assigned_to_project: 'Nexus FinTech Platform',
          assigned_team_lead: 'Kavita Iyer',
          license_seats: 12
        },
        {
          name: 'Figma Enterprise Organization Workspace',
          type: 'Design & Dev Tools',
          provider: 'Figma Inc.',
          cost_per_month_inr: 32000,
          renewal_date: '2026-09-28',
          status: 'Active',
          assigned_to_project: 'Global Design System',
          assigned_team_lead: 'Sameer Sen',
          license_seats: 25
        },
        {
          name: 'Cloudflare Enterprise SSL & DDoS Shield',
          type: 'SSL & Security',
          provider: 'Cloudflare Inc.',
          cost_per_month_inr: 21500,
          renewal_date: '2026-09-15',
          status: 'Expiring Soon',
          assigned_to_project: 'All Active Client Portals',
          assigned_team_lead: 'Rohan Joshi'
        },
        {
          name: 'OpenAI GPT-4o Enterprise API Gateway',
          type: 'API Gateway',
          provider: 'OpenAI LLC',
          cost_per_month_inr: 54000,
          renewal_date: '2026-10-05',
          status: 'Active',
          assigned_to_project: 'AI Copilot & Workflow Engines',
          assigned_team_lead: 'Kavita Iyer'
        },
        {
          name: 'GitHub Enterprise & Copilot Business Seats',
          type: 'SaaS License',
          provider: 'GitHub Inc.',
          cost_per_month_inr: 18000,
          renewal_date: '2026-11-01',
          status: 'Active',
          assigned_to_project: 'Core Engineering',
          assigned_team_lead: 'Kavita Iyer',
          license_seats: 18
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Digital Notifications exist in Supabase DB
  try {
    const { count } = await supabase.from('digital_notifications').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('digital_notifications').insert([
        {
          title: 'Invoice Paid',
          description: 'Nexus FinTech Global settled Tax Invoice #INV-DIG-8810 (₹4,50,000 via RTGS).',
          category: 'Finance',
          is_read: false
        },
        {
          title: 'Sprint Milestone Completed',
          description: 'Starlight E-Commerce Design System approved for production build.',
          category: 'Projects',
          is_read: false
        },
        {
          title: 'AWS Cloud Alert',
          description: 'Production cluster utilization steady at 38%. Zero downtime.',
          category: 'DevOps',
          is_read: true
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Rimi Notifications exist in Supabase DB
  try {
    const { count } = await supabase.from('rimi_notifications').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('rimi_notifications').insert([
        {
          title: 'Reefer Truck #MH-12 Temp Optimal',
          description: 'Active reefer logging steady at -19.4°C. No deviations detected.',
          category: 'Telemetry',
          is_read: false,
          is_archived: false
        },
        {
          title: 'Order #SO-2026-901 Delivered',
          description: 'HyperCity Supermarket Mumbai Hub confirmed fresh arrival.',
          category: 'Logistics',
          is_read: false,
          is_archived: false
        },
        {
          title: 'Cold Storage Room #1 Telemetry',
          description: 'Deep freeze warehouse locked at -22.4°C.',
          category: 'Storage',
          is_read: true,
          is_archived: false
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Rimi Messages exist in Supabase DB
  try {
    const { count } = await supabase.from('rimi_messages').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('rimi_messages').insert([
        {
          conversation_id: '1',
          contact_name: 'Rajesh Kulkarni (Mumbai Cold Hub)',
          contact_role: 'Warehouse Manager',
          sender_name: 'Rajesh Kulkarni',
          message: 'Good morning. Checking cold room #2 telemetry.',
          is_self: false
        },
        {
          conversation_id: '1',
          contact_name: 'Rajesh Kulkarni (Mumbai Cold Hub)',
          contact_role: 'Warehouse Manager',
          sender_name: 'Rimi Cold Chain Lead',
          message: 'Confirmed. Keep temperature locked at -22°C.',
          is_self: true
        },
        {
          conversation_id: '1',
          contact_name: 'Rajesh Kulkarni (Mumbai Cold Hub)',
          contact_role: 'Warehouse Manager',
          sender_name: 'Rajesh Kulkarni',
          message: 'Temperature steady at -22.4°C across all sensors.',
          is_self: false
        }
      ]);
    }
  } catch (e) {}

  // Ensure initial Trade Cargo Losses exist in Supabase DB
  try {
    const { count } = await supabase.from('trade_cargo_losses').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('trade_cargo_losses').insert([
        {
          shipment_no: 'SHP-9821',
          container_no: 'MSKU-9821045',
          loss_type: 'Port Demurrage Penalty',
          port_location: 'Port of Rotterdam (ECT Delta Terminal)',
          loss_amount_inr: 120000,
          shrinkage_metric_tons: 0,
          carrier_responsible: 'Maersk Line',
          insurance_claim_status: 'Claim Lodged',
          incident_date: '2026-08-25',
          description: '4-day customs inspection terminal overstay clearance demurrage charge.'
        },
        {
          shipment_no: 'SHP-9822',
          container_no: 'CMAU-4412093',
          loss_type: 'Handling Impact Shock',
          port_location: 'Hamburg Container Terminal Altenwerder',
          loss_amount_inr: 85000,
          shrinkage_metric_tons: 1.2,
          carrier_responsible: 'CMA CGM Logistics',
          insurance_claim_status: 'Recovered / Reimbursed',
          incident_date: '2026-08-14',
          description: 'Cranial hoisting rough set-down damaged protective steel wrap.'
        }
      ]);
    }
  } catch (e) {}
}

