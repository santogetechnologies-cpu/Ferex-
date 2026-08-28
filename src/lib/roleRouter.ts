export type FerexRole =
  | 'student'
  | 'admin'
  | 'super_admin'
  | 'superadmin'
  | 'central'
  | 'staff'
  | 'counselor'
  | 'digital'
  | 'trade'
  | 'rimi';

const ROLE_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  admin: '/admin/dashboard',
  super_admin: '/admin/dashboard',
  superadmin: '/admin/dashboard',
  central: '/central/dashboard',
  staff: '/staff/dashboard',
  counselor: '/staff/dashboard',
  digital: '/digital/dashboard',
  trade: '/trade/dashboard',
  rimi: '/rimi/dashboard',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student Portal',
  admin: 'Admin Portal',
  super_admin: 'Super Admin Portal',
  superadmin: 'Super Admin Portal',
  central: 'Central Enterprise Portal',
  staff: 'Staff Portal',
  counselor: 'Counselor Portal',
  digital: 'Digital Portal',
  trade: 'Global Trade Portal',
  rimi: 'Rimi Distribution Portal',
};

export function normalizeRole(role?: string | null): string {
  if (!role) return 'student';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return clean;
}

export function getDashboardRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return ROLE_ROUTES[normalized] || '/student/dashboard';
}

export function getPortalLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || 'Dashboard';
}

export function isValidRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized in ROLE_ROUTES;
}
