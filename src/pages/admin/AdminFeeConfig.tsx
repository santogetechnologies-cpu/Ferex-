import { EducationFeeEditor } from '../../components/EducationFeeEditor';
import { CountryFeePackageBuilder } from '../../components/CountryFeePackageBuilder';

/**
 * One place for all education fees: the registration fee (every student), the normal flow fees, and the country packages.
 * Which one a student follows is confirmed per student under Payments.
 */
export function AdminFeeConfig() {
  return (
    <div className="space-y-10">
      <EducationFeeEditor />
      <div className="border-t border-slate-200 pt-8">
        <CountryFeePackageBuilder />
      </div>
    </div>
  );
}
