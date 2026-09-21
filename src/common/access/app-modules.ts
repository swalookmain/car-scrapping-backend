/**
 * Permission catalog — add a module here and it appears on GET /access/modules
 * (Staff → Module access). No frontend catalog list.
 *
 * Then: @SetModule on the controller, moduleId on the FE route/sidebar,
 * and one RBAC matrix row (staff with module → 200; without → 403).
 */
import { Role } from 'src/common/enum/role.enum';
export const APP_MODULES = {
  DASHBOARD: {
    id: 'dashboard',
    label: 'Dashboard',
    assignableToStaff: true,
  },
  LEADS: {
    id: 'leads',
    label: 'Leads',
    assignableToStaff: true,
  },
  AUCTIONS: {
    id: 'auctions',
    label: 'Auctions',
    assignableToStaff: true,
  },
  INVOICES: {
    id: 'invoices',
    label: 'Purchase Invoices',
    assignableToStaff: true,
  },
  YARD: {
    id: 'yard',
    label: 'Yard',
    assignableToStaff: true,
  },
  LIFTING: {
    id: 'lifting',
    label: 'Lifting Vehicles',
    assignableToStaff: true,
  },
  INVENTORY: {
    id: 'inventory',
    label: 'Inventory',
    assignableToStaff: true,
  },
  COMPLIANCE: {
    id: 'compliance',
    label: 'Vehicle Compliance',
    assignableToStaff: true,
  },
  SALES: {
    id: 'sales',
    label: 'Sales & Dispatch',
    assignableToStaff: true,
  },
  TAX: {
    id: 'tax',
    label: 'Tax Compliance',
    assignableToStaff: true,
  },
  ACCOUNTING: {
    id: 'accounting',
    label: 'Accounting',
    assignableToStaff: false,
  },
  STAFF: {
    id: 'staff',
    label: 'Staff Management',
    assignableToStaff: false,
  },
  AUDIT_LOGS: {
    id: 'audit-logs',
    label: 'Audit Logs',
    assignableToStaff: false,
  },
  SETTINGS: {
    id: 'settings',
    label: 'Settings',
    assignableToStaff: false,
  },
  ORGANIZATIONS: {
    id: 'organizations',
    label: 'Organizations',
    assignableToStaff: false,
  },
} as const;

export type AppModuleDefinition = (typeof APP_MODULES)[keyof typeof APP_MODULES];
export type ModuleId = AppModuleDefinition['id'];

export const MODULE_LIST: AppModuleDefinition[] = Object.values(APP_MODULES);

export function permissionCatalog() {
  return MODULE_LIST.map((m) => ({
    id: m.id,
    label: m.label,
    assignableToStaff: m.assignableToStaff,
  }));
}

export const MODULE_IDS = new Set<string>(MODULE_LIST.map((m) => m.id));

export const STAFF_ASSIGNABLE_MODULE_IDS: string[] = MODULE_LIST.filter(
  (m) => m.assignableToStaff,
).map((m) => m.id);

export const ADMIN_MODULE_IDS: string[] = MODULE_LIST.filter(
  (m) => m.id !== APP_MODULES.ORGANIZATIONS.id,
).map((m) => m.id);

export function sanitizeStaffModules(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const allowed = new Set(STAFF_ASSIGNABLE_MODULE_IDS);
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }
    if (!allowed.has(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
  }
  return [...seen];
}

export function listsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export function tokenModulesForRole(role: Role, stored?: unknown): string[] {
  if (role === Role.STAFF) {
    return sanitizeStaffModules(stored);
  }
  return [];
}

export function meModulesForRole(role: Role, stored?: unknown): string[] {
  if (role === Role.ADMIN) {
    return [...ADMIN_MODULE_IDS];
  }
  if (role === Role.STAFF) {
    return sanitizeStaffModules(stored);
  }
  return [];
}
