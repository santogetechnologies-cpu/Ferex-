// Helper: Student Portal Impersonation for Education Admin and Counselors

export interface ImpersonatedStudent {
  id: string;
  name: string;
  email: string;
  country?: string;
  counselor?: string;
  role: 'student';
  originalAdminRole?: string;
  originalAdminEmail?: string;
  impersonatedAt: string;
}

const STORAGE_KEY = 'ferex_impersonated_student';

export function getImpersonatedStudent(): ImpersonatedStudent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function startImpersonatingStudent(student: {
  id: string;
  name: string;
  email: string;
  country?: string;
  counselor?: string;
  originalAdminRole?: string;
  originalAdminEmail?: string;
}): ImpersonatedStudent {
  const payload: ImpersonatedStudent = {
    id: student.id,
    name: student.name,
    email: student.email,
    country: student.country,
    counselor: student.counselor,
    role: 'student',
    originalAdminRole: student.originalAdminRole || 'education_admin',
    originalAdminEmail: student.originalAdminEmail || '',
    impersonatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event('ferex-impersonation-changed'));
  }

  return payload;
}

export function stopImpersonatingStudent(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('ferex-impersonation-changed'));
  }
}

export function isImpersonatingStudent(): boolean {
  return getImpersonatedStudent() !== null;
}
