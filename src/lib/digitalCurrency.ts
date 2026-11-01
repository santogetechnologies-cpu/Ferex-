export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  locale: string;
  country: string;
}

export const DIGITAL_CURRENCIES: CurrencyInfo[] = [
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', flag: '🇵🇱', locale: 'pl-PL', country: 'Poland' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US', country: 'United States' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE', country: 'European Union' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', locale: 'en-GB', country: 'United Kingdom' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', locale: 'en-AE', country: 'United Arab Emirates' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN', country: 'India' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', locale: 'en-CA', country: 'Canada' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU', country: 'Australia' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', locale: 'de-CH', country: 'Switzerland' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG', country: 'Singapore' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', locale: 'en-SA', country: 'Saudi Arabia' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP', country: 'Japan' },
];

export function getCurrencySymbol(code?: string): string {
  if (!code) return '₹';
  const c = DIGITAL_CURRENCIES.find(cur => cur.code.toUpperCase() === code.toUpperCase());
  return c ? c.symbol : code;
}

export function formatDigitalCurrency(amount: number, code: string = 'INR'): string {
  const num = Number(amount || 0);
  const curCode = (code || 'INR').toUpperCase();
  const c = DIGITAL_CURRENCIES.find(cur => cur.code === curCode);

  if (curCode === 'PLN') {
    return `${num.toLocaleString('pl-PL')} zł`;
  }
  if (curCode === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  if (curCode === 'USD') {
    return `$${num.toLocaleString('en-US')}`;
  }
  if (curCode === 'EUR') {
    return `€${num.toLocaleString('de-DE')}`;
  }
  if (curCode === 'GBP') {
    return `£${num.toLocaleString('en-GB')}`;
  }
  if (curCode === 'AED') {
    return `AED ${num.toLocaleString('en-AE')}`;
  }

  try {
    return new Intl.NumberFormat(c?.locale || 'en-US', {
      style: 'currency',
      currency: curCode,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${c?.symbol || curCode} ${num.toLocaleString()}`;
  }
}

export const DIGITAL_PAYMENT_METHODS = [
  'International Wire / SWIFT',
  'SEPA / European IBAN Transfer',
  'BLIK / Polish Bank Transfer (Poland)',
  'Wise / Multi-Currency Transfer',
  'Stripe / International Credit Card',
  'PayPal',
  'Bank Transfer',
  'UPI / NetBanking',
  'Other International Method'
] as const;

