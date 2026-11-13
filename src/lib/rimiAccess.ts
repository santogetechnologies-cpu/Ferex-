import { useAuth } from '../contexts/AuthContext';

/** Cold Chain Admin: full control, including approvals, task assignment and attendance verification. */
export const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'rimi', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

/** Warehouse / operations users: manage customers, orders, payments, products, batches and cold storage hubs. */
export const RIMI_WAREHOUSE_ROLES = ['operations_manager', 'warehouse_lead', 'warehouse_manager', 'warehouse_staff', 'rimi_staff', 'ops'];

export function rimiAccessFor(role?: string | null) {
  const r = (role || '').toLowerCase();
  const isAdmin = RIMI_ADMIN_ROLES.includes(r);
  const isWarehouse = RIMI_WAREHOUSE_ROLES.includes(r);
  return {
    role: r,
    isAdmin,
    isWarehouse,
    /** Add / edit / delete operational records (customers, orders, payments, products, batches, hubs). */
    canManage: isAdmin || isWarehouse,
  };
}

/** Access flags for the signed-in Rimi user. The role comes only from the signed-in profile, never from the email or browser storage. */
export function useRimiAccess() {
  const { profile } = useAuth();
  return rimiAccessFor(profile?.role);
}
