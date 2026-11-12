import { useEffect, useState } from 'react';
import { getCountryFeePackages, getStudentBillingAssignment } from '../lib/api/feePackages';
import { getStudentFeeOverrides } from '../lib/api/payments';
import { setActiveStudentFeeProfile, type StudentFeeProfile } from '../lib/educationBilling';

const EVENTS = ['ferex_student_billing_flow_change', 'ferex_fee_packages_change', 'ferex_fee_config_change', 'ferex_payment_change'];

export async function loadStudentFeeProfile(studentId: string): Promise<StudentFeeProfile> {
  const [assignment, packages, overrides] = await Promise.all([
    getStudentBillingAssignment(studentId).catch(() => null),
    getCountryFeePackages().catch(() => []),
    getStudentFeeOverrides(studentId).catch(() => ({})),
  ]);
  const pkg = assignment?.flow_mode === 'package' && assignment.package_id
    ? packages.find(p => p.id === assignment.package_id) ?? null
    : null;
  return { pkg, overrides };
}

/** Loads a student's package and discounts. With `publish`, also exposes them to the gating helpers. */
export function useStudentFeeProfile(studentId?: string, publish = false) {
  const [profile, setProfile] = useState<StudentFeeProfile>({});
  useEffect(() => {
    if (!studentId) { setProfile({}); if (publish) setActiveStudentFeeProfile(undefined); return; }
    let cancelled = false;
    const refresh = () => loadStudentFeeProfile(studentId).then(p => {
      if (cancelled) return;
      setProfile(p);
      if (publish) setActiveStudentFeeProfile(p);
    });
    refresh();
    EVENTS.forEach(e => window.addEventListener(e, refresh));
    return () => {
      cancelled = true;
      EVENTS.forEach(e => window.removeEventListener(e, refresh));
      if (publish) setActiveStudentFeeProfile(undefined);
    };
  }, [studentId, publish]);
  return profile;
}
