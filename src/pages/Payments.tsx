export function formatFeeEURandINR(feeStr?: string | number): string {
  if (feeStr === undefined || feeStr === null || feeStr === '' || feeStr === 'N/A' || feeStr === '—') return '—';
  const str = String(feeStr).trim();
  if (str.includes('~') && (str.includes('₹') || str.includes('€') || str.includes('$') || str.includes('£') || str.includes('PLN') || str.includes('zł'))) return str;

  // Handle fee range like "€3,200 - €4,500 / yr" or "12,000 - 18,000 PLN / yr"
  const rangeMatch = str.match(/([€$£₹]?)\s*([\d,]+)\s*[-–]\s*([€$£₹]?)\s*([\d,]+)(.*)/);
  if (rangeMatch) {
    const sym = rangeMatch[1] || rangeMatch[3] || '';
    const low = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    const high = parseInt(rangeMatch[4].replace(/,/g, ''), 10);
    const suffix = rangeMatch[5] || '';
    if (!isNaN(low) && !isNaN(high)) {
      if (str.toLowerCase().includes('pln') || str.includes('zł') || sym === 'zł') {
        const inrLow = Math.round(low * 21);
        const inrHigh = Math.round(high * 21);
        const eurLow = Math.round(low / 4.3);
        const eurHigh = Math.round(high / 4.3);
        return `${low.toLocaleString('en-US')} - ${high.toLocaleString('en-US')} PLN${suffix} (~€${eurLow.toLocaleString('en-US')} - €${eurHigh.toLocaleString('en-US')} | ~₹${inrLow.toLocaleString('en-IN')} - ₹${inrHigh.toLocaleString('en-IN')})`;
      } else if (sym === '€' || str.toLowerCase().includes('eur')) {
        const inrLow = Math.round(low * 90);
        const inrHigh = Math.round(high * 90);
        const plnLow = Math.round(low * 4.3);
        const plnHigh = Math.round(high * 4.3);
        return `€${low.toLocaleString('en-US')} - €${high.toLocaleString('en-US')}${suffix} (~₹${inrLow.toLocaleString('en-IN')} - ₹${inrHigh.toLocaleString('en-IN')} | ~${plnLow.toLocaleString()} - ${plnHigh.toLocaleString()} PLN)`;
      } else if (sym === '₹' || str.toLowerCase().includes('inr')) {
        const eurLow = Math.round(low / 90);
        const eurHigh = Math.round(high / 90);
        return `₹${low.toLocaleString('en-IN')} - ₹${high.toLocaleString('en-IN')}${suffix} (~€${eurLow.toLocaleString('en-US')} - €${eurHigh.toLocaleString('en-US')}${suffix})`;
      } else if (sym === '£') {
        const inrLow = Math.round(low * 105);
        const inrHigh = Math.round(high * 105);
        return `£${low.toLocaleString('en-US')} - £${high.toLocaleString('en-US')}${suffix} (~₹${inrLow.toLocaleString('en-IN')} - ₹${inrHigh.toLocaleString('en-IN')}${suffix})`;
      }
    }
  }

  // Single fee amount
  const cleanDigits = str.replace(/,/g, '').match(/\d+/);
  if (!cleanDigits) return str;
  const num = parseInt(cleanDigits[0], 10);
  if (isNaN(num) || num === 0) return str;

  const hasYr = str.toLowerCase().includes('/ yr') || str.toLowerCase().includes('per year') || str.toLowerCase().includes('/yr');
  const hasMo = str.toLowerCase().includes('/ mo') || str.toLowerCase().includes('per month') || str.toLowerCase().includes('/mo');
  const suffix = hasYr ? ' / yr' : hasMo ? ' / mo' : '';

  if (str.toLowerCase().includes('pln') || str.includes('zł') || str.toLowerCase().includes('zloty')) {
    const inr = Math.round(num * 21);
    const eur = Math.round(num / 4.3);
    return `${num.toLocaleString('en-US')} PLN${suffix} (~€${eur.toLocaleString('en-US')} | ~₹${inr.toLocaleString('en-IN')})`;
  }
  if (str.includes('€') || str.toLowerCase().includes('eur')) {
    const inr = Math.round(num * 90);
    const pln = Math.round(num * 4.3);
    return `€${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix} | ~${pln.toLocaleString()} PLN)`;
  }
  if (str.includes('₹') || str.toLowerCase().includes('inr')) {
    const eur = Math.round(num / 90);
    return `₹${num.toLocaleString('en-IN')}${suffix} (~€${eur.toLocaleString('en-US')}${suffix})`;
  }
  if (str.includes('£') || str.toLowerCase().includes('gbp')) {
    const inr = Math.round(num * 105);
    return `£${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix})`;
  }
  if (str.includes('$') || str.toLowerCase().includes('usd')) {
    const inr = Math.round(num * 84);
    return `$${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix})`;
  }

  return str;
}

export function parseFeeToINR(feeStr?: string | number): number {
  if (!feeStr) return 0;
  if (typeof feeStr === 'number') return feeStr;
  const str = String(feeStr).replace(/,/g, '');
  const match = str.match(/\d+/);
  if (!match) return 0;
  const num = parseInt(match[0], 10);
  if (isNaN(num)) return 0;
  if (str.toLowerCase().includes('pln') || str.includes('zł') || str.toLowerCase().includes('zloty')) {
    return num * 21;
  }
  if (str.includes('€') || str.toLowerCase().includes('eur')) {
    return num * 90;
  }
  if (str.includes('£') || str.toLowerCase().includes('gbp')) {
    return num * 105;
  }
  if (str.includes('CAD') || str.toLowerCase().includes('cad')) {
    return num * 62;
  }
  if (str.includes('$') || str.toLowerCase().includes('usd')) {
    return num * 84;
  }
  return num;
}


export { StudentEducationBilling as Payments } from '../components/EducationBillingPages';
