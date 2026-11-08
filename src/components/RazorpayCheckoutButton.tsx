import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { openRazorpayCheckout, type RazorpayCheckoutOptions } from '../lib/razorpayCheckout';

export interface RazorpayCheckoutButtonProps {
  amount: number;
  isPaise?: boolean;
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  className?: string;
  buttonText?: string;
  onSuccess?: RazorpayCheckoutOptions['onSuccess'];
  onError?: RazorpayCheckoutOptions['onError'];
  onDismiss?: RazorpayCheckoutOptions['onDismiss'];
  disabled?: boolean;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  isPaise = false,
  currency = 'INR',
  receipt,
  name,
  description,
  notes,
  prefill,
  className,
  buttonText,
  onSuccess,
  onError,
  onDismiss,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await openRazorpayCheckout({
        amount,
        isPaise,
        currency,
        receipt,
        name,
        description,
        notes,
        prefill,
        onSuccess: async (res) => {
          setLoading(false);
          if (onSuccess) await onSuccess(res);
        },
        onError: (err) => {
          setLoading(false);
          const msg = err.description || err.message || 'Payment processing failed';
          setErrorMessage(msg);
          if (onError) onError(err);
        },
        onDismiss: () => {
          setLoading(false);
          if (onDismiss) onDismiss();
        },
      });
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Could not initiate checkout');
    }
  };

  const defaultClasses =
    'h-10 px-5 bg-[#58051E] hover:bg-[#430316] text-white font-bold text-xs rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={className || defaultClasses}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to Razorpay...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText || `Pay ${currency === 'INR' ? '₹' : currency} ${amount.toLocaleString('en-IN')}`}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
