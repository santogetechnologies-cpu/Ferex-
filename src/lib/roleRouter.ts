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
  | 'trade'
  | 'trade_admin'
  | 'global_trade'
  | 'trade_client'
  | 'rimi'
  | 'rimi_admin'
  | 'rimi_frozen'
  | 'rimi_client';

const ROLE_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  admin: '/central/dashboard',
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
  trade: '/trade/dashboard',
  trade_admin: '/trade/dashboard',
  global_trade: '/trade/dashboard',
  trade_client: '/trade/client-portal',
  rimi: '/rimi/dashboard',
  rimi_admin: '/rimi/dashboard',
  rimi_frozen: '/rimi/dashboard',
  rimi_client: '/rimi/customer-portal',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student Portal',
  admin: 'Central Super Admin Command Center',
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
  digital_client: 'Ferex Digital Client Portal',
  trade: 'Global Trade Portal',
  trade_admin: 'Global Trade Portal',
  global_trade: 'Global Trade Portal',
  trade_client: 'Global Trade Partner Portal',
  rimi: 'Rimi Frozen Distribution Portal',
  rimi_admin: 'Rimi Frozen Distribution Portal',
  rimi_frozen: 'Rimi Frozen Distribution Portal',
  rimi_client: 'Rimi Cold Chain Customer Portal',
};

export function isSuperAdmin(role?: string | null, email?: string | null): boolean {
  if (role) {
    const cleanRole = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (
      cleanRole === 'education_admin' ||
      cleanRole === 'education' ||
      cleanRole === 'trade_admin' ||
      cleanRole === 'trade' ||
      cleanRole === 'global_trade' ||
      cleanRole === 'rimi_admin' ||
      cleanRole === 'rimi' ||
      cleanRole === 'rimi_frozen' ||
      cleanRole === 'digital_admin' ||
      cleanRole === 'digital' ||
      cleanRole === 'ferex_digital' ||
      cleanRole === 'staff' ||
      cleanRole === 'counselor' ||
      cleanRole === 'student' ||
      cleanRole === 'trade_client' ||
      cleanRole === 'rimi_client' ||
      cleanRole === 'digital_client'
    ) {
      return false;
    }

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
      cleanEmail.includes('digital_admin')
    ) {
      return false;
    }

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

    if (cleanEmail.includes('admin') && !cleanEmail.includes('edu') && !cleanEmail.includes('trade') && !cleanEmail.includes('rimi') && !cleanEmail.includes('digital')) {
      return true;
    }
  }

  if (role && role.toLowerCase().trim() === 'admin') {
    return true;
  }

  return false;
}



export function normalizeRole(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return 'superadmin';
  if (!role) return 'superadmin';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return clean;
}

export function getDashboardRoute(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return '/central/dashboard';
  const normalized = normalizeRole(role, email);
  return ROLE_ROUTES[normalized] || '/central/dashboard';
}

export function getPortalLabel(role?: string | null, email?: string | null): string {
  if (isSuperAdmin(role, email)) return 'Central Super Admin Command Center';
  const normalized = normalizeRole(role, email);
  return ROLE_LABELS[normalized] || 'Central Super Admin Command Center';
}

export function isValidRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized in ROLE_ROUTES;
}

