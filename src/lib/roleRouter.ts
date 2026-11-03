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
  | 'digital_client'
  | 'digital_manager'
  | 'project_manager'
  | 'digimanager'
  | 'pm'
  | 'trade'
  | 'trade_admin'
  | 'global_trade'
  | 'trade_client'
  | 'logistics_officer'
  | 'rimi'
  | 'rimi_admin'
  | 'rimi_frozen'
  | 'rimi_client'
  | 'operations_manager';

const ROLE_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  admin: '/admin/dashboard',
  education_admin: '/admin/dashboard',
  education: '/admin/dashboard',
  super_admin: '/central/dashboard',
  superadmin: '/central/dashboard',
  central: '/central/dashboard',
  staff: '/staff/dashboard',
  counselor: '/staff/dashboard',
  digital: '/digital/dashboard',
  digital_admin: '/digital/dashboard',
  ferex_digital: '/digital/dashboard',
  digital_client: '/digital/client-portal',
  digital_manager: '/digital/pm/dashboard',
  project_manager: '/digital/pm/dashboard',
  digimanager: '/digital/pm/dashboard',
  pm: '/digital/pm/dashboard',
  trade: '/trade/dashboard',
  trade_admin: '/trade/dashboard',
  global_trade: '/trade/dashboard',
  trade_client: '/trade/dashboard',
  logistics_officer: '/trade/dashboard',
  rimi: '/rimi/dashboard',
  rimi_admin: '/rimi/dashboard',
  rimi_frozen: '/rimi/dashboard',
  rimi_client: '/rimi/customer-portal',
  operations_manager: '/rimi/dashboard',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student Portal',
  admin: 'Ferex Education Admin Portal',
  education_admin: 'Ferex Education Admin Portal',
  education: 'Ferex Education Admin Portal',
  super_admin: 'Central Super Admin HQ',
  superadmin: 'Central Super Admin HQ',
  central: 'Central Super Admin HQ',
  staff: 'Staff & Counselor Portal',
  counselor: 'Admissions Counselor Portal',
  digital: 'Ferex Digital Admin Portal',
  digital_admin: 'Ferex Digital Admin Portal',
  ferex_digital: 'Ferex Digital Admin Portal',
  digital_client: 'Ferex Digital Client Portal',
  digital_manager: 'Ferex Digital Project Manager',
  project_manager: 'Ferex Digital Project Manager',
  digimanager: 'Ferex Digital Project Manager',
  pm: 'Ferex Digital Project Manager',
  trade: 'Global Trade Admin Portal',
  trade_admin: 'Global Trade Admin Portal',
  global_trade: 'Global Trade Admin Portal',
  trade_client: 'Global Trade Partner Portal',
  logistics_officer: 'Trade Logistics Desk',
  rimi: 'Rimi Frozen Admin Portal',
  rimi_admin: 'Rimi Frozen Admin Portal',
  rimi_frozen: 'Rimi Frozen Admin Portal',
  rimi_client: 'Rimi Cold Chain Customer Portal',
  operations_manager: 'Rimi Operations Desk',
};

export function isSuperAdmin(role?: string | null, _email?: string | null): boolean {
  return ['superadmin', 'super_admin', 'central'].includes((role || '').toLowerCase().trim().replace(/[\s-]+/g, '_'));
}

export function normalizeRole(role?: string | null, _email?: string | null): string {
  if (isSuperAdmin(role)) return 'superadmin';
  const clean = (role || 'student').toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (['pm', 'digital_pm', 'digital_project_manager', 'digital_manager', 'digimanager'].includes(clean)) return 'project_manager';
  return clean;
}

export function getDashboardRoute(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return '/central/dashboard';
  const normalized = normalizeRole(role, email);
  return ROLE_ROUTES[normalized] || '/login';
}

export function getPortalLabel(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return 'Central Super Admin HQ';
  const normalized = normalizeRole(role, email);
  return ROLE_LABELS[normalized] || 'Ferex Portal';
}

export function isValidRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized in ROLE_ROUTES;
}
