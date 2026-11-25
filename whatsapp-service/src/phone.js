// Phone number validation and normalisation. WhatsApp wants country code + number, digits only.
import { config } from './config.js';

/**
 * "+91 91433 82792", "0091 91433 82792" and "9143382792" all become "919143382792".
 * Throws on anything that cannot be a real international number (E.164: 8-15 digits).
 */
export function normalizePhone(input, defaultCountryCode = config.defaultCountryCode) {
  let d = String(input ?? '').trim();
  if (!d) throw new Error('Phone number is empty.');
  if (/[a-z]/i.test(d)) throw new Error(`Phone number "${d}" contains letters.`);
  const hadPlus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!hadPlus && d.startsWith('00')) d = d.slice(2);
  else if (!hadPlus && defaultCountryCode && d.length === 10) d = defaultCountryCode + d;       // local 10-digit number
  else if (!hadPlus && defaultCountryCode === '91' && d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1); // 0 + 10 digits
  if (d.length < 8 || d.length > 15) throw new Error(`Phone number "${input}" is not a valid international number (needs 8-15 digits with the country code).`);
  return d;
}

export const isValidPhone = (input, cc) => { try { normalizePhone(input, cc); return true; } catch { return false; } };
