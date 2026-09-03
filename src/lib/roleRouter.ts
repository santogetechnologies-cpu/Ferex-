export type FerexRole =
  | 'student'
  | 'admin'
  | 'education_admin'
  | 'education'
  | 'super_admin'
  | 'superadmin'
  | 'central'
  | 'staff'
  | 'counselor'
  | 'digital'
  | 'digital_admin'
  | 'ferex_digital'
  | 'trade'
  | 'trade_admin'
  | 'global_trade'
  | 'rimi'
  | 'rimi_admin'
  | 'rimi_frozen';

const ROLE_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  admin: '/central/dashboard',
  super_admin: '/central/dashboard',
  superadmin: '/central/dashboard',
  central: '/central/dashboard',
  education_admin: '/admin/dashboard',
  education: '/admin/dashboard',
  staff: '/staff/dashboard',
  counselor: '/staff/dashboard',
  digital: '/digital/dashboard',
  digital_admin: '/digital/dashboard',
  ferex_digital: '/digital/dashboard',
  trade: '/trade/dashboard',
  trade_admin: '/trade/dashboard',
  global_trade: '/trade/dashboard',
  rimi: '/rimi/dashboard',
  rimi_admin: '/rimi/dashboard',
  rimi_frozen: '/rimi/dashboard',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student Portal',
  admin: 'Central Super Admin Command Center',
  super_admin: 'Central Super Admin Command Center',
  superadmin: 'Central Super Admin Command Center',
  central: 'Central Super Admin Command Center',
  education_admin: 'Ferex Education Admin Portal',
  education: 'Ferex Education Admin Portal',
  super_admin: 'Central Super Admin Command Center',
  superadmin: 'Central Super Admin Command Center',
  central: 'Central Super Admin Command Center',
  staff: 'Staff & Counselor Portal',
  counselor: 'Counselor Portal',
  digital: 'Ferex Digital Portal',
  digital_admin: 'Ferex Digital Portal',
  ferex_digital: 'Ferex Digital Portal',
  trade: 'Global Trade Portal',
  trade_admin: 'Global Trade Portal',
  global_trade: 'Global Trade Portal',
  rimi: 'Rimi Frozen Distribution Portal',
  rimi_admin: 'Rimi Frozen Distribution Portal',
  rimi_frozen: 'Rimi Frozen Distribution Portal',
};

export function normalizeRole(role?: string | null): string {
  if (!role) return 'superadmin';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return clean;
}

export function getDashboardRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return ROLE_ROUTES[normalized] || '/central/dashboard';
}

export function getPortalLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || 'Super Admin Portal';
}

export function isValidRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized in ROLE_ROUTES;
}
