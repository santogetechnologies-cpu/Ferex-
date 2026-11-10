import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getImpersonatedStudent, type ImpersonatedStudent } from '../lib/api/studentImpersonation';

export interface ActiveStudentScope {
  activeStudentId: string;
  activeStudentEmail: string;
  activeStudentName: string;
  isImpersonating: boolean;
  impersonatedStudent: ImpersonatedStudent | null;
}

/**
 * Universal hook to scope any student page to either:
 * 1. The impersonated student (if Admin/Counselor is managing their portal)
 * 2. The logged-in student (normal student session)
 */
export function useActiveStudentScope(): ActiveStudentScope {
  const { user, profile } = useAuth();
  const [impersonated, setImpersonated] = useState<ImpersonatedStudent | null>(() => getImpersonatedStudent());

  useEffect(() => {
    const handleImpersonationChanged = () => {
      setImpersonated(getImpersonatedStudent());
    };
    window.addEventListener('ferex-impersonation-changed', handleImpersonationChanged);
    return () => window.removeEventListener('ferex-impersonation-changed', handleImpersonationChanged);
  }, []);

  const isImpersonating = Boolean(impersonated);
  const activeStudentId = impersonated?.id || user?.id || '';
  const activeStudentEmail = impersonated?.email || profile?.email || user?.email || '';
  const activeStudentName = impersonated?.name || profile?.full_name || (activeStudentEmail ? activeStudentEmail.split('@')[0] : 'Student');

  return {
    activeStudentId,
    activeStudentEmail,
    activeStudentName,
    isImpersonating,
    impersonatedStudent: impersonated,
  };
}

