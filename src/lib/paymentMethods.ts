/** The payment methods offered when recording a payment, in every app that collects money. */
export const PAYMENT_METHODS = ['UPI', 'Google Pay (GPay)', 'PhonePe', 'Paytm', 'Credit Card', 'Debit Card', 'Net Banking', 'Bank Transfer', 'Cash', 'Cheque'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
/** Name shown to people: "Bank Transfer" reads as "Direct Bank Transfer" in the Education screens. */
export const methodLabel = (m: string) => (m === 'Bank Transfer' ? 'Direct Bank Transfer' : m);
