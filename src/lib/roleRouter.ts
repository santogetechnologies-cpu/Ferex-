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
  | 'project_manager'
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
  project_manager: '/digital/dashboard',
  trade: '/trade/dashboard',
  trade_admin: '/trade/dashboard',
  global_trade: '/trade/dashboard',
  trade_client: '/trade/client-portal',
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
  super_admin: 'Central Super Admin Command Center',
  superadmin: 'Central Super Admin Command Center',
  central: 'Central Super Admin Command Center',
  staff: 'Staff & Counselor Portal',
  counselor: 'Admissions Counselor Portal',
  digital: 'Ferex Digital Admin Portal',
  digital_admin: 'Ferex Digital Admin Portal',
  ferex_digital: 'Ferex Digital Admin Portal',
  digital_client: 'Ferex Digital Client Portal',
  project_manager: 'Ferex Digital Project Manager',
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

export function isSuperAdmin(role?: string | null, email?: string | null): boolean {
  if (role) {
    const cleanRole = role.toLowerCase().trim().replace(/[\s-]+/g, '_');

    // Explicitly non-super roles — return false immediately
    if (
      cleanRole === 'education_admin' ||
      cleanRole === 'education' ||
      cleanRole === 'admin' ||
      cleanRole === 'trade_admin' ||
      cleanRole === 'trade' ||
      cleanRole === 'global_trade' ||
      cleanRole === 'logistics_officer' ||
      cleanRole === 'rimi_admin' ||
      cleanRole === 'rimi' ||
      cleanRole === 'rimi_frozen' ||
      cleanRole === 'operations_manager' ||
      cleanRole === 'digital_admin' ||
      cleanRole === 'digital' ||
      cleanRole === 'ferex_digital' ||
      cleanRole === 'project_manager' ||
      cleanRole === 'staff' ||
      cleanRole === 'counselor' ||
      cleanRole === 'student' ||
      cleanRole === 'trade_client' ||
      cleanRole === 'rimi_client' ||
      cleanRole === 'digital_client'
    ) {
      return false;
    }

    // Explicitly super roles
    if (
      cleanRole === 'superadmin' ||
      cleanRole === 'super_admin' ||
      cleanRole === 'central'
    ) {
      return true;
    }
  }

  if (email) {
    const cleanEmail = email.toLowerCase().trim();

    // Explicitly non-super emails
    if (
      cleanEmail.includes('ferexedu') ||
      cleanEmail.includes('eduadmin') ||
      cleanEmail.includes('education_admin') ||
      cleanEmail.includes('ferextrade') ||
      cleanEmail.includes('tradeadmin') ||
      cleanEmail.includes('trade_admin') ||
      cleanEmail.includes('ferexrimi') ||
      cleanEmail.includes('rimiadmin') ||
      cleanEmail.includes('rimi_admin') ||
      cleanEmail.includes('ferexdigital') ||
      cleanEmail.includes('digitaladmin') ||
      cleanEmail.includes('digital_admin') ||
      cleanEmail.includes('counselor')
    ) {
      return false;
    }

    // Explicitly super emails
    if (
      cleanEmail.includes('superadmin') ||
      cleanEmail.includes('super_admin') ||
      cleanEmail.includes('super-admin') ||
      cleanEmail.includes('ferexadmin') ||
      cleanEmail.includes('central') ||
      cleanEmail === 'admin@ferex.com' ||
      cleanEmail === 'admin@ferexventures.com' ||
      cleanEmail === 'admin@santoge.com'
    ) {
      return true;
    }
  }

  // Do NOT default to superadmin — unknown roles are NOT super admin
  return false;
}

export function normalizeRole(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return 'superadmin';
  if (!role) return 'student';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return clean;
}

export function getDashboardRoute(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return '/central/dashboard';
  const normalized = normalizeRole(role, email);
  return ROLE_ROUTES[normalized] || '/login';
}

export function getPortalLabel(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return 'Central Super Admin Command Center';
  const normalized = normalizeRole(role, email);
  return ROLE_LABELS[normalized] || 'Ferex Portal';
}

export function isValidRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized in ROLE_ROUTES;
}
