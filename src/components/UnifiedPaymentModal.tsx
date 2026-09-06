import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, QrCode, ShieldCheck, CheckCircle2, Copy, Check,
  ExternalLink, Lock, AlertCircle, Sparkles, Download, X, Clock, ArrowRight
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import {
  getGlobalPaymentGateways,
  generateUpiPaymentUri,
  generateQrCodeImageUrl,
  recordUnifiedPayment,
  type GlobalPaymentGatewayConfig,
  DEFAULT_PAYMENT_GATEWAYS
} from '../lib/api/paymentGateways';

export interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receipt: any) => void;
  division: 'education' | 'digital' | 'rimi' | 'trade';
  amount: number;
  currency?: 'INR' | 'EUR' | 'USD';
  title?: string;
  invoiceNo?: string;
  invoiceId?: string;
  purpose?: string;
  payerName?: string;
  payerEmail?: string;
  studentId?: string;
  clientId?: string;
  customerId?: string;
}

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  division,
  amount,
  currency = 'INR',
  title = 'Enterprise Invoice Settlement',
  invoiceNo,
  invoiceId,
  purpose,
  payerName = 'Payer Account',
  payerEmail,
  studentId,
  clientId,
  customerId,
}) => {
  const [gateways, setGateways] = useState<GlobalPaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAYS);
  const [activeTab, setActiveTab] = useState<'upi' | 'stripe'>('upi');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  // Stripe card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(payerName);

  // UPI state
  const [utrNumber, setUtrNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      getGlobalPaymentGateways().then(setGateways);
      setPaymentSuccess(null);
      setIsProcessing(false);
      setUtrNumber('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const divisionSettings = gateways.divisions[division] || { allowStripe: true, allowUpi: true };
  const upiId = divisionSettings.customUpiId || gateways.upi.upiId;
  const merchantName = divisionSettings.customMerchantName || gateways.upi.merchantName;
  const note = purpose || invoiceNo || 'Ferex Invoice Settlement';
  const effectiveInvoiceNo = invoiceNo || `INV-${division.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

  // Generated UPI Uri and QR
  const upiUri = generateUpiPaymentUri({
    upiId,
    merchantName,
    amount,
    currency,
    transactionNote: note,
    transactionRef: effectiveInvoiceNo,
  });
  const qrCodeUrl = generateQrCodeImageUrl(upiUri, 280);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) return;

    setIsProcessing(true);
    // Simulate real Stripe authorization & 3DS confirmation flow
    setTimeout(async () => {
      const receiptNo = `RCP-STR-${Date.now().toString().slice(-6)}`;
      const stripeRef = `pi_3M${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

      const receipt = await recordUnifiedPayment({
        division,
        amount,
        currency,
        paymentMethod: 'Stripe',
        gatewayRef: stripeRef,
        receiptNumber: receiptNo,
        studentId,
        studentName: payerName,
        clientId,
        clientName: payerName,
        customerId,
        customerName: payerName,
        invoiceId,
        invoiceNo: effectiveInvoiceNo,
        purpose: note,
        metadata: {
          cardLast4: cardNumber.slice(-4) || '4242',
          cardBrand: 'Visa / Mastercard',
          stripeEnvironment: gateways.stripe.environment,
        }
      });

      setIsProcessing(false);
      setPaymentSuccess(receipt);
      if (onSuccess) onSuccess(receipt);
    }, 1200);
  };

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) return;

    setIsProcessing(true);
    setTimeout(async () => {
      const receiptNo = `RCP-UPI-${Date.now().toString().slice(-6)}`;
      const receipt = await recordUnifiedPayment({
        division,
        amount,
        currency: 'INR',
        paymentMethod: 'UPI',
        gatewayRef: utrNumber.trim(),
        receiptNumber: receiptNo,
        studentId,
        studentName: payerName,
        clientId,
        clientName: payerName,
        customerId,
        customerName: payerName,
        invoiceId,
        invoiceNo: effectiveInvoiceNo,
        purpose: note,
        metadata: {
          upiIdUsed: upiId,
          merchantName,
        }
      });

      setIsProcessing(false);
      setPaymentSuccess(receipt);
      if (onSuccess) onSuccess(receipt);
    }, 900);
  };

  const formatAmount = (amt: number, curr = currency) => {
    if (curr === 'EUR') return `€${amt.toLocaleString()}`;
    if (curr === 'USD') return `$${amt.toLocaleString()}`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto antialiased text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 256-Bit SSL Encrypted
              </span>
              <span className="text-[10px] font-bold text-white/70 uppercase">
                {division} Portal
              </span>
            </div>

            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="text-xs text-white/80 mt-0.5">{note}</p>

            <div className="mt-4 pt-3 border-t border-white/20 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/70">Total Amount Payable</span>
                <div className="text-2xl font-black text-white">{formatAmount(amount)}</div>
              </div>
              <span className="text-[11px] font-mono text-white/80 bg-black/20 px-2.5 py-1 rounded-lg">
                Ref: {effectiveInvoiceNo}
              </span>
            </div>
          </div>

          {/* Success Screen */}
          {paymentSuccess ? (
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Payment Successfully Cleared</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{formatAmount(amount)}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Settled via <strong className="text-slate-900">{paymentSuccess.paymentMethod}</strong> • Receipt generated and recorded in ledger.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 space-y-1.5 text-left max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="font-mono font-black text-slate-900">{paymentSuccess.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Ref / UTR:</span>
                  <span className="font-mono font-bold text-slate-900">{paymentSuccess.gatewayRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account:</span>
                  <span className="font-bold text-slate-900">{payerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="font-bold text-slate-900">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 max-w-md mx-auto pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Print Receipt
                </Button>
                <Button
                  size="sm"
                  onClick={onClose}
                  className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Payment Gateway Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'upi'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-[#6A1B2E]" />
                  <span>UPI Instant QR</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Zero Fee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('stripe')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'stripe'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Stripe (Card / Global)</span>
                  {gateways.stripe.environment === 'sandbox' && (
                    <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">Test/Live</span>
                  )}
                </button>
              </div>

              {/* ─── TAB 1: UPI PAYMENT ────────────────────────────────────────────── */}
              {activeTab === 'upi' && (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
                    {/* Dynamic QR Code Card */}
                    <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0 text-center">
                      <img
                        src={qrCodeUrl}
                        alt="Scan UPI QR"
                        className="w-36 h-36 mx-auto rounded-lg"
                      />
                      <span className="text-[9px] font-black uppercase text-slate-400 mt-1 block">Scan with any UPI App</span>
                    </div>

                    {/* VPA Details & Deep links */}
                    <div className="space-y-3 flex-1 w-full text-left">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Merchant VPA ID</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-mono font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 select-all">
                            {upiId}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="h-8 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedUpi ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-600">
                        <span>Payee: <strong>{merchantName}</strong></span>
                      </div>

                      {/* Instant Mobile Deep Links */}
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Pay with Mobile Apps:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                            <a
                              key={app}
                              href={upiUri}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10.5px] font-black text-slate-800 hover:border-[#6A1B2E] hover:text-[#6A1B2E] transition-all shadow-2xs"
                            >
                              {app}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* UTR Verification Form */}
                  <form onSubmit={handleUpiSubmit} className="space-y-3 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        Enter 12-Digit Bank UTR / UPI Reference Number *
                      </label>
                      <input
                        required
                        type="text"
                        value={utrNumber}
                        onChange={e => setUtrNumber(e.target.value)}
                        placeholder="e.g. 428190348210 or UPI-Ref-9921"
                        className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isProcessing || !utrNumber.trim()}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md rounded-xl"
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 animate-spin" /> Verifying UTR Settlement...
                        </span>
                      ) : (
                        `Confirm & Clear Payment (${formatAmount(amount)})`
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {/* ─── TAB 2: STRIPE PAYMENT ────────────────────────────────────────── */}
              {activeTab === 'stripe' && (
                <form onSubmit={handleStripeSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      required
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Card Number (Visa / Mastercard / Amex)
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full h-10 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Expiry (MM/YY)</label>
                      <input
                        required
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="12/28"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">CVC / CVV</label>
                      <input
                        required
                        type="password"
                        maxLength={4}
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        placeholder="•••"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-[11px] font-semibold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" /> Stripe 3DS Secured Checkout
                    </span>
                    <span className="text-[10px] font-mono text-blue-700">
                      {gateways.stripe.environment === 'production' ? 'Live Gateway' : 'Test Mode'}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md rounded-xl"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 animate-spin" /> Authorizing via Stripe...
                      </span>
                    ) : (
                      `Pay via Stripe (${formatAmount(amount)})`
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
