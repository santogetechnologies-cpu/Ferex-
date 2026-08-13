/**
 * Maps a user's role (stored in Supabase user_metadata.role) to the correct
 * portal dashboard route within FEREX.
 *
 * To set a user's role, update their metadata in the Supabase dashboard:
 *   Authentication → Users → [user] → Edit → Raw user_metadata
 *   e.g. { "role": "student" }
 *
 * Valid roles: student | admin | superadmin | trade | rimi | digital | staff
 */
export type FerexRole =
  | 'student'
  | 'admin'
  | 'superadmin'
  | 'trade'
  | 'rimi'
  | 'digital'
  | 'staff';

const ROLE_ROUTES: Record<FerexRole, string> = {
  student: '/student/dashboard',
  admin: '/admin/dashboard',
  superadmin: '/central/dashboard',
  trade: '/trade/dashboard',
  rimi: '/rimi/dashboard',
  digital: '/digital/dashboard',
  staff: '/staff/dashboard',
};

const ROLE_LABELS: Record<FerexRole, string> = {
  student: 'Student Portal',
  admin: 'Education Admin Console',
  superadmin: 'Central Super Admin Console',
  trade: 'Global Trade Portal',
  rimi: 'Rimi Frozen Distribution Portal',
  digital: 'Ferex Digital Portal',
  staff: 'Staff Portal',
};

export function getDashboardRoute(role: string): string {
  return ROLE_ROUTES[role as FerexRole] ?? '/';
}

export function getPortalLabel(role: string): string {
  return ROLE_LABELS[role as FerexRole] ?? 'Dashboard';
}

export function isValidRole(role: string): role is FerexRole {
  return role in ROLE_ROUTES;
}
