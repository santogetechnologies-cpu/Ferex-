import type { CountryFeePackage } from '../lib/api/feePackages';
import { PAYMENT_STATUS_TONE, type PackagePaymentStatus } from '../lib/educationBilling';

const chip = 'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold';

/** Country, package, specialization and (optionally) payment status as tags. Everything comes from the saved package. */
export function PackageTags({ country, pkg, status, flow }: { country?: string; pkg?: CountryFeePackage | null; status?: PackagePaymentStatus; flow?: 'pending' | 'normal' | 'package' }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {country && <span className={`${chip} bg-slate-50 text-slate-700 border-slate-200`}>{country}</span>}
      {flow === 'normal' && <span className={`${chip} bg-slate-50 text-slate-700 border-slate-200`}>Normal flow</span>}
      {flow === 'pending' && <span className={`${chip} bg-amber-50 text-amber-700 border-amber-200`}>Plan not confirmed</span>}
      {pkg && <span className={`${chip} bg-[#5A0122]/10 text-[#5A0122] border-[#5A0122]/20`}>{pkg.name}</span>}
      {pkg?.specialization && <span className={`${chip} bg-indigo-50 text-indigo-700 border-indigo-200`}>{pkg.specialization}</span>}
      {status && <span className={`${chip} ${PAYMENT_STATUS_TONE[status]}`}>{status}</span>}
    </span>
  );
}
