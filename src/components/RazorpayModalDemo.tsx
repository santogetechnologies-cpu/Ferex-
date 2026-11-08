import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { openRazorpayCheckout } from '../lib/razorpayCheckout';

export interface RazorpayModalDemoProps {
  defaultAmount?: number;
  currency?: string;
  onPaymentSuccess?: (result: any) => void;
}

export const RazorpayModalDemo: React.FC<RazorpayModalDemoProps> = ({
  defaultAmount = 500,
  currency = 'INR',
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customerName, setCustomerName] = useState<string>('Test Student');
  const [customerEmail, setCustomerEmail] = useState<string>('student@example.com');
  const [customerContact, setCustomerContact] = useState<string>('9999999999');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [verifiedPayment, setVerifiedPayment] = useState<any>(null);

  const handlePay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (amount <= 0) {
      setStatus('error');
      setStatusMessage('Please enter a valid amount greater than ₹1');
      return;
    }

    setStatus('loading');
    setStatusMessage('Creating order on backend...');

    try {
      await openRazorpayCheckout({
        amount,
        currency,
        name: 'FEREX HIGHER EDUCATION',
        description: 'Standard Web Checkout Payment',
        receipt: `demo_rcpt_${Date.now()}`,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerContact,
        },
        onSuccess: (result) => {
          setStatus('success');
          setStatusMessage(result.message || 'Payment successfully verified by server!');
          setVerifiedPayment(result);
          if (onPaymentSuccess) {
            onPaymentSuccess(result);
          }
        },
        onError: (err) => {
          setStatus('error');
          setStatusMessage(err.description || err.message || 'Payment failed or declined');
        },
        onDismiss: () => {
          if (status !== 'success') {
            setStatus('idle');
            setStatusMessage('Checkout was cancelled by user');
          }
        },
      });
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Could not initiate Razorpay checkout');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-lg mx-auto text-left">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Razorpay Standard Checkout</h3>
          <p className="text-xs text-slate-500">Secure web modal with HMAC-SHA256 signature verification</p>
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-4 text-xs font-semibold">
        <div>
          <label className="block text-slate-600 mb-1 text-[11px] uppercase tracking-wider font-bold">
            Amount ({currency})
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-10 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#58051E]"
              placeholder="500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 mb-1 text-[11px] uppercase tracking-wider font-bold">
              Student / Payer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1 text-[11px] uppercase tracking-wider font-bold">
              Email
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 mb-1 text-[11px] uppercase tracking-wider font-bold">
            Mobile Number
          </label>
          <input
            type="tel"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            placeholder="9876543210"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full h-11 bg-[#58051E] hover:bg-[#430316] text-white font-extrabold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {status === 'loading' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Opening Razorpay Modal...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Pay with Razorpay (₹{amount.toLocaleString('en-IN')})</span>
            </>
          )}
        </button>
      </form>

      {/* Status Banners */}
      {statusMessage && (
        <div className="mt-4">
          {status === 'success' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              {verifiedPayment && (
                <div className="text-[11px] font-mono text-emerald-950 space-y-0.5 pt-2 border-t border-emerald-200/60">
                  <p>Payment ID: <span className="font-bold">{verifiedPayment.payment_id}</span></p>
                  <p>Order ID: <span className="font-bold">{verifiedPayment.order_id}</span></p>
                  <p className="text-emerald-700 font-sans font-semibold">HMAC-SHA256 Signature Verified on Backend</p>
                </div>
              )}
            </div>
          ) : status === 'error' ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-2">{statusMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};
