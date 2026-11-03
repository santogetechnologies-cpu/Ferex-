import { useEffect, useState } from 'react';
import { fetchStudentAgreement } from '../lib/api/agreement';

export function useStudentAgreement(studentId?: string) {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    let active = true;
    setSigned(false);
    const refresh = () => {
      if (!studentId) return;
      fetchStudentAgreement(studentId).then(agreement => { if (active) setSigned(agreement?.status === 'Signed'); }).catch(() => { if (active) setSigned(false); });
    };
    refresh();
    window.addEventListener('ferex_agreement_change', refresh);
    return () => { active = false; window.removeEventListener('ferex_agreement_change', refresh); };
  }, [studentId]);
  return signed;
}
