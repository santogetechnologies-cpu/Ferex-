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

  // Ensure initial Trade Clients exist in Supabase DB
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
}
