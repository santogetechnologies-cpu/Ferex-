/**
 * usePermissions.ts
 * Role-based permission hooks for Rimi Frozen CRM and Ferex Digital CRM.
 * Call useRimiPermissions() or useDigitalPermissions() in any component.
 */

import { useAuth } from '../contexts/AuthContext';

// ─── Rimi role strings ────────────────────────────────────────────────────────
const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'operations_manager', 'admin', 'central', 'super_admin', 'superadmin'];
const RIMI_STAFF_ROLES = ['rimi_staff', 'warehouse_manager', 'ops'];
const CENTRAL_ROLES = ['central', 'super_admin', 'superadmin'];

// ─── Digital role strings ─────────────────────────────────────────────────────
const DIGITAL_ADMIN_ROLES = ['digital_admin', 'ferex_digital', 'digital', 'admin', 'central', 'super_admin', 'superadmin'];
const DIGITAL_STAFF_ROLES = ['digital_staff', 'project_manager', 'pm', 'digimanager'];

// ─── Rimi Permissions ─────────────────────────────────────────────────────────

export interface RimiPermissions {
  isCentral: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  // Aliases for general CRM checks
  canViewAllCRM: boolean;
  canAssign: boolean;
  canReassign: boolean;
  canDelete: boolean;
  canViewReports: boolean;
  // CRM
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canAssignCustomer: boolean;
  canReassignCustomer: boolean;
  canDeleteCustomer: boolean;
  // Orders / Sales
  canViewAllOrders: boolean;
  canCreateOrder: boolean;
  canUpdateOrderStatus: boolean; // own assigned customers
  canExportOrders: boolean;
  // Payments
  canRecordPayment: boolean;
  canViewAllPayments: boolean;
  // Inventory
  canManageInventory: boolean;
  // Staff / Settings
  canManageStaff: boolean;
  canManageSettings: boolean;
  canManageMasters: boolean;
  // Notes / Activity
  canAddNotes: boolean;
}

export function useRimiPermissions(): RimiPermissions {
  const { profile } = useAuth();
  const role = (profile?.role || '').toLowerCase();

  const isCentral = CENTRAL_ROLES.includes(role);
  const isAdmin = RIMI_ADMIN_ROLES.includes(role);
  const isStaff = RIMI_STAFF_ROLES.includes(role) && !isAdmin;

  return {
    isCentral,
    isAdmin,
    isStaff,

    canViewAllCRM: isCentral || isAdmin,
    canAssign: isCentral || isAdmin,
    canReassign: isCentral || isAdmin,
    canDelete: isCentral || isAdmin,
    canCreateCustomer: isCentral || isAdmin,
    canEditCustomer: isCentral || isAdmin,
    canAssignCustomer: isCentral || isAdmin,
    canReassignCustomer: isCentral || isAdmin,
    canDeleteCustomer: isCentral || isAdmin,

    canViewAllOrders: isCentral || isAdmin,
    canCreateOrder: isCentral || isAdmin || isStaff,
    canUpdateOrderStatus: isCentral || isAdmin || isStaff,
    canExportOrders: isCentral || isAdmin,

    canRecordPayment: isCentral || isAdmin || isStaff,
    canViewAllPayments: isCentral || isAdmin,

    canManageInventory: isCentral || isAdmin,

    canViewReports: isCentral || isAdmin,

    canManageStaff: isCentral || isAdmin,
    canManageSettings: isCentral || isAdmin,
    canManageMasters: isCentral || isAdmin,

    canAddNotes: true, // all roles can add notes
  };
}

// ─── Digital Permissions ──────────────────────────────────────────────────────

export interface DigitalPermissions {
  isCentral: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  // Aliases for general CRM checks
  canViewAllCRM: boolean;
  canAssign: boolean;
  canReassign: boolean;
  canDelete: boolean;
  canViewReports: boolean;
  // Clients
  canViewAllClients: boolean;
  canCreateClient: boolean;
  canEditClient: boolean;
  canDeleteClient: boolean;
  // Projects
  canViewAllProjects: boolean;
  canCreateProject: boolean;
  canEditProject: boolean;
  canAssignProject: boolean;
  canReassignProject: boolean;
  canDeleteProject: boolean;
  canUpdateProjectStatus: boolean;
  // Tasks
  canViewAllTasks: boolean;
  canCreateTask: boolean;
  canAssignTask: boolean;
  canUpdateOwnTask: boolean;
  // Deliverables
  canUploadDeliverable: boolean;
  canApproveDeliverable: boolean;
  // Invoices / Payments
  canGenerateInvoice: boolean;
  canRecordPayment: boolean;
  canViewAllPayments: boolean;
  // Staff / Settings
  canManageStaff: boolean;
  canManageSettings: boolean;
  canManageMasters: boolean;
}

export function useDigitalPermissions(): DigitalPermissions {
  const { profile } = useAuth();
  const role = (profile?.role || '').toLowerCase();

  const isCentral = CENTRAL_ROLES.includes(role);
  const isAdmin = DIGITAL_ADMIN_ROLES.includes(role);
  const isStaff = DIGITAL_STAFF_ROLES.includes(role) && !isAdmin;

  return {
    isCentral,
    isAdmin,
    isStaff,

    canViewAllCRM: isCentral || isAdmin,
    canAssign: isCentral || isAdmin,
    canReassign: isCentral || isAdmin,
    canDelete: isCentral || isAdmin,

    canViewAllClients: isCentral || isAdmin,
    canCreateClient: isCentral || isAdmin,
    canEditClient: isCentral || isAdmin,
    canDeleteClient: isCentral || isAdmin,

    canViewAllProjects: isCentral || isAdmin,
    canCreateProject: isCentral || isAdmin,
    canEditProject: isCentral || isAdmin,
    canAssignProject: isCentral || isAdmin,
    canReassignProject: isCentral || isAdmin,
    canDeleteProject: isCentral || isAdmin,
    canUpdateProjectStatus: true, // staff can update their own project status

    canViewAllTasks: isCentral || isAdmin,
    canCreateTask: isCentral || isAdmin,
    canAssignTask: isCentral || isAdmin,
    canUpdateOwnTask: true,

    canUploadDeliverable: true,
    canApproveDeliverable: isCentral || isAdmin,

    canGenerateInvoice: isCentral || isAdmin,
    canRecordPayment: isCentral || isAdmin,
    canViewAllPayments: isCentral || isAdmin,

    canViewReports: isCentral || isAdmin,

    canManageStaff: isCentral || isAdmin,
    canManageSettings: isCentral || isAdmin,
    canManageMasters: isCentral || isAdmin,
  };
}

// ─── Utility: get current user id for filtering ───────────────────────────────
export function useCurrentUserId(): string {
  const { profile } = useAuth();
  return profile?.id || profile?.email || '';
}

export function useCurrentUserEmail(): string {
  const { profile } = useAuth();
  return profile?.email || '';
}

export function useCurrentUserName(): string {
  const { profile } = useAuth();
  return profile?.full_name || profile?.email || '';
}
