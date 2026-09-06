import { supabase } from '../supabase';

export interface StripeGatewayConfig {
  enabled: boolean;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  supportedCurrencies: string[]; // ['INR', 'EUR', 'USD']
  defaultCurrency: 'INR' | 'EUR' | 'USD';
  autoCapture: boolean;
}

export interface UpiGatewayConfig {
  enabled: boolean;
  upiId: string; // e.g. ferex.payments@icici
  merchantName: string; // e.g. FEREX ENTERPRISE GROUP
  merchantCode?: string;
  qrCodeEnabled: boolean;
  collectRequestEnabled: boolean;
  autoVerifyUtr: boolean;
}

export interface DivisionGatewaySettings {
  allowStripe: boolean;
  allowUpi: boolean;
  customUpiId?: string;
  customMerchantName?: string;
}

export interface GlobalPaymentGatewayConfig {
  stripe: StripeGatewayConfig;
  upi: UpiGatewayConfig;
  divisions: {
    education: DivisionGatewaySettings;
    digital: DivisionGatewaySettings;
    rimi: DivisionGatewaySettings;
    trade: DivisionGatewaySettings;
  };
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_PAYMENT_GATEWAYS: GlobalPaymentGatewayConfig = {
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
  updated_by: 'Super Admin',
};

const LOCAL_STORAGE_KEY = 'ferex_global_payment_gateways';

// Retrieve global gateway configuration
export async function getGlobalPaymentGateways(): Promise<GlobalPaymentGatewayConfig> {
  // 1. Check Supabase system_config
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'payment_gateways')
      .maybeSingle();

    if (!error && data?.value) {
      const merged = { ...DEFAULT_PAYMENT_GATEWAYS, ...data.value };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    // Fallback gracefully
  }

  // 2. Check localStorage
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_PAYMENT_GATEWAYS, ...JSON.parse(saved) };
    } catch {}
  }

  return DEFAULT_PAYMENT_GATEWAYS;
}

// Save global gateway configuration (from Super Admin)
export async function saveGlobalPaymentGateways(
  config: GlobalPaymentGatewayConfig,
  adminName = 'Super Admin'
): Promise<GlobalPaymentGatewayConfig> {
  const updated: GlobalPaymentGatewayConfig = {
    ...config,
    updated_at: new Date().toISOString(),
    updated_by: adminName,
  };

  // 1. Save to local storage
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  // 2. Save to Supabase system_config
  try {
    await supabase.from('system_config').upsert({
      key: 'payment_gateways',
      value: updated,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync payment gateways to Supabase system_config:', err);
  }

  // 3. Dispatch event for live sync across open tabs & portals
  window.dispatchEvent(new CustomEvent('ferex_payment_gateways_change', { detail: updated }));

  return updated;
}

// Generate valid UPI standard payment intent URI
export function generateUpiPaymentUri(params: {
  upiId: string;
  merchantName: string;
  amount: number;
  currency?: string;
  transactionNote?: string;
  transactionRef?: string;
}): string {
  const { upiId, merchantName, amount, currency = 'INR', transactionNote = 'Invoice Payment', transactionRef } = params;
  const cleanUpi = encodeURIComponent(upiId.trim());
  const cleanName = encodeURIComponent(merchantName.trim());
  const cleanNote = encodeURIComponent(transactionNote.slice(0, 50));
  const cleanRef = transactionRef ? encodeURIComponent(transactionRef) : `FRX${Date.now()}`;
  const amtFormatted = amount.toFixed(2);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amtFormatted}&cu=${currency}&tn=${cleanNote}&tr=${cleanRef}`;
}

// Generate instant dynamic QR code image URL using high-speed QR rendering service
export function generateQrCodeImageUrl(content: string, size = 250): string {
  const encoded = encodeURIComponent(content);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encoded}`;
}

// Record unified payment transaction across tables & generate official receipt
export interface UnifiedPaymentPayload {
  division: 'education' | 'digital' | 'rimi' | 'trade';
  amount: number;
  currency: string;
  paymentMethod: 'Stripe' | 'UPI';
  gatewayRef: string; // Stripe PaymentIntent ID or UPI UTR
  receiptNumber: string;
  studentId?: string;
  studentName?: string;
  clientId?: string;
  clientName?: string;
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNo?: string;
  purpose: string;
  metadata?: Record<string, any>;
}

export async function recordUnifiedPayment(payload: UnifiedPaymentPayload) {
  const now = new Date().toISOString();
  const txRecord = {
    id: `tx_${payload.paymentMethod.toLowerCase()}_${Date.now()}`,
    ...payload,
    status: 'Paid',
    paid_at: now,
    created_at: now,
  };

  // 1. Division-specific record keeping in Supabase & LocalStorage
  if (payload.division === 'education') {
    try {
      await supabase.from('payments').insert([
        {
          user_id: payload.studentId || 'anonymous_student',
          amount: payload.amount,
          currency: payload.currency,
          purpose: payload.purpose,
          payment_method: payload.paymentMethod === 'Stripe' ? 'Stripe (Card / 3DS)' : 'UPI (Instant QR / UTR)',
          status: 'Paid',
          reference_number: payload.gatewayRef,
          receipt_number: payload.receiptNumber,
          created_at: now,
        }
      ]);
    } catch {}
    window.dispatchEvent(new Event('ferex_payment_change'));
  } else if (payload.division === 'digital') {
    try {
      // Update invoice if given
      if (payload.invoiceId || payload.invoiceNo) {
        await supabase
          .from('digital_invoices')
          .update({ status: 'Paid', updated_at: now })
          .or(`id.eq.${payload.invoiceId},invoice_no.eq.${payload.invoiceNo}`);
      }
      await supabase.from('digital_payments').insert([
        {
          client_id: payload.clientId,
          invoice_no: payload.invoiceNo || payload.receiptNumber,
          amount: payload.amount,
          payment_method: payload.paymentMethod,
          payment_gateway: payload.paymentMethod,
          transaction_ref: payload.gatewayRef,
          receipt_number: payload.receiptNumber,
          status: 'Paid',
          payment_date: now.split('T')[0],
        }
      ]);
    } catch {}
    window.dispatchEvent(new Event('ferex_digital_invoices_change'));
  } else if (payload.division === 'rimi') {
    try {
      if (payload.invoiceNo) {
        await supabase
          .from('rimi_sales_orders')
          .update({ payment_status: 'Paid', order_status: 'Delivered', updated_at: now })
          .eq('order_no', payload.invoiceNo);
      }
      await supabase.from('rimi_payments').insert([
        {
          distributor_id: payload.customerId,
          amount: payload.amount,
          payment_type: payload.paymentMethod,
          transaction_ref: payload.gatewayRef,
          status: 'Completed',
          payment_date: now.split('T')[0],
        }
      ]);
    } catch {}
    window.dispatchEvent(new Event('ferex_rimi_orders_change'));
  } else if (payload.division === 'trade') {
    try {
      if (payload.invoiceNo) {
        await supabase
          .from('trade_invoices')
          .update({ status: 'Paid', updated_at: now })
          .eq('invoice_no', payload.invoiceNo);
      }
      await supabase.from('trade_payments').insert([
        {
          beneficiary: payload.customerName || 'Port Trade Partner',
          amount: payload.amount,
          currency: payload.currency,
          payment_type: `${payload.paymentMethod} Gateway`,
          swift_reference: payload.gatewayRef,
          status: 'Completed',
          payment_date: now.split('T')[0],
        }
      ]);
    } catch {}
    window.dispatchEvent(new Event('ferex_trade_invoices_change'));
  }

  // 2. Global payment ledger entry in localStorage
  const savedLedger = localStorage.getItem('ferex_unified_payment_ledger');
  const ledger = savedLedger ? JSON.parse(savedLedger) : [];
  ledger.unshift(txRecord);
  localStorage.setItem('ferex_unified_payment_ledger', JSON.stringify(ledger.slice(0, 100)));

  window.dispatchEvent(new CustomEvent('ferex_unified_payment_completed', { detail: txRecord }));
  return txRecord;
}
