import { EducationFeeEditor } from '../../components/EducationFeeEditor';
import { CountryFeePackageBuilder } from '../../components/CountryFeePackageBuilder';

/**
 * One place for all education fees:
 * 1. Standard fees: the basic registration fee for every student, plus the separate payments used when a
 *    student's country has no plan.
 * 2. Country fee plans: per-country packages or split payments that replace the separate payments.
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
