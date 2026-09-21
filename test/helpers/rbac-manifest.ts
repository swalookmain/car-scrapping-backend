import { Role } from '../../src/common/enum/role.enum';

const OID = '507f1f77bcf86cd799439011';
const ORG_ID = '507f1f77bcf86cd799439012';

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

/** PUBLIC = no auth; JWT_ONLY = any authenticated role; Role[] = explicit allow-list */
export type RbacAccess = 'PUBLIC' | 'JWT_ONLY' | Role[];

export interface RbacRoute {
  method: HttpMethod;
  path: string;
  access: RbacAccess;
}

export interface RbacRouteGroup {
  name: string;
  routes: RbacRoute[];
}

export const RBAC_ROUTE_GROUPS: RbacRouteGroup[] = [
  {
    name: 'App',
    routes: [{ method: 'get', path: '/', access: 'PUBLIC' }],
  },
  {
    name: 'Auth',
    routes: [
      { method: 'post', path: '/auth/login', access: 'PUBLIC' },
      { method: 'post', path: '/auth/signup', access: 'PUBLIC' },
      { method: 'post', path: '/auth/refresh', access: 'PUBLIC' },
      { method: 'post', path: '/auth/logout', access: 'PUBLIC' },
    ],
  },
  {
    name: 'Users',
    routes: [
      { method: 'post', path: '/users/create', access: [Role.SUPER_ADMIN] },
      { method: 'post', path: '/users/create-staff', access: [Role.ADMIN] },
      { method: 'get', path: '/users', access: [Role.SUPER_ADMIN] },
      {
        method: 'get',
        path: `/users/${OID}`,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
      },
      {
        method: 'patch',
        path: `/users/${OID}`,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
      },
      { method: 'delete', path: `/users/${OID}`, access: [Role.SUPER_ADMIN] },
      {
        method: 'patch',
        path: `/users/update-refresh-token/${OID}`,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
      },
      {
        method: 'get',
        path: `/users/find-all-staff-by-organization/${ORG_ID}`,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Access',
    routes: [
      { method: 'get', path: '/access/modules', access: [Role.ADMIN] },
    ],
  },
  {
    name: 'Organizations',
    routes: [
      { method: 'post', path: '/organizations', access: [Role.SUPER_ADMIN] },
      { method: 'get', path: '/organizations', access: [Role.SUPER_ADMIN] },
      {
        method: 'get',
        path: `/organizations/${ORG_ID}/subscription`,
        access: [Role.SUPER_ADMIN],
      },
      {
        method: 'patch',
        path: `/organizations/${ORG_ID}/subscription`,
        access: [Role.SUPER_ADMIN],
      },
      {
        method: 'get',
        path: '/organizations/letter-settings',
        access: [Role.ADMIN],
      },
      {
        method: 'patch',
        path: '/organizations/letter-settings',
        access: [Role.ADMIN],
      },
      {
        method: 'post',
        path: '/organizations/letter-settings/upload',
        access: [Role.ADMIN],
      },
      {
        method: 'get',
        path: `/organizations/${ORG_ID}`,
        access: [Role.SUPER_ADMIN],
      },
      {
        method: 'patch',
        path: `/organizations/${ORG_ID}`,
        access: [Role.SUPER_ADMIN],
      },
      {
        method: 'delete',
        path: `/organizations/${ORG_ID}`,
        access: [Role.SUPER_ADMIN],
      },
    ],
  },
  {
    name: 'AuditLog',
    routes: [
      { method: 'post', path: '/audit-logs', access: 'JWT_ONLY' },
      { method: 'get', path: '/audit-logs', access: [Role.SUPER_ADMIN] },
      { method: 'get', path: '/audit-logs/staff', access: [Role.ADMIN] },
      {
        method: 'get',
        path: `/audit-logs/${OID}`,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    ],
  },
  {
    name: 'Dashboard',
    routes: [
      {
        method: 'get',
        path: '/dashboard/overview',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'PartCatalog',
    routes: [
      {
        method: 'get',
        path: '/part-catalog/categories',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/part-catalog/categories',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/part-catalog/makes',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/part-catalog/makes/${OID}/models`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/part-catalog/models/${OID}/variants`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/part-catalog/variants/${OID}/parts`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/part-catalog/checklist/vehicle/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/part-catalog/checklist/mmv',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/part-catalog/resolve',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/part-catalog/variants/${OID}/parts`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Yard',
    routes: [
      {
        method: 'get',
        path: '/yard/vehicles',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/yard/vehicles/by-vehicle-invoice/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/yard/vehicles/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/yard/vehicles/${OID}/movements`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/yard/vehicles/${OID}/status`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/yard/vehicles/${OID}/start-dismantling`,
        access: [Role.ADMIN, Role.STAFF],
      },
      { method: 'post', path: '/yard/backfill', access: [Role.ADMIN] },
      {
        method: 'get',
        path: '/yard/dashboard/summary',
        access: [Role.ADMIN, Role.STAFF],
      },
      { method: 'get', path: '/yard/zones', access: [Role.ADMIN, Role.STAFF] },
      { method: 'post', path: '/yard/zones', access: [Role.ADMIN] },
    ],
  },
  {
    name: 'Lifting',
    routes: [
      {
        method: 'get',
        path: '/lifting',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/lifting/summary',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/lifting/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'VehicleCompliance',
    routes: [
      {
        method: 'post',
        path: '/vehicle-compliance/vechile-cod',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/vehicle-compliance/vechile-cod',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/vehicle-compliance/vechile-cod/${OID}/rto`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/vehicle-compliance/vechile-cod/vehicle/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'TaxCompliance',
    routes: [
      {
        method: 'post',
        path: '/tax-compliance/config',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/tax-compliance/config',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/tax-compliance/eway-bills',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/tax-compliance/eway-bills',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/tax-compliance/gst-audit-log',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'SalesDispatch',
    routes: [
      {
        method: 'post',
        path: '/sales-dispatch/buyers',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/sales-dispatch/buyers',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/sales-dispatch/buyers/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/sales-dispatch/buyers/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/sales-dispatch/buyers/${OID}`,
        access: [Role.ADMIN],
      },
      {
        method: 'post',
        path: '/sales-dispatch/invoices',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/sales-dispatch/invoices',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/sales-dispatch/invoices/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/sales-dispatch/invoices/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/sales-dispatch/invoices/${OID}/confirm`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/sales-dispatch/invoices/${OID}/cancel`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Reports',
    routes: [
      {
        method: 'get',
        path: '/reports/gst-summary',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Lead',
    routes: [
      { method: 'post', path: '/leads', access: [Role.ADMIN] },
      { method: 'get', path: '/leads', access: [Role.ADMIN, Role.STAFF] },
      { method: 'get', path: '/leads/lookup', access: [Role.ADMIN, Role.STAFF] },
      {
        method: 'get',
        path: `/leads/lookup/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/leads/${OID}/documents`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/leads/${OID}/documents`,
        access: [Role.ADMIN],
      },
      {
        method: 'get',
        path: `/leads/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/leads/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/leads/${OID}/assign`,
        access: [Role.ADMIN],
      },
      {
        method: 'patch',
        path: `/leads/${OID}/status`,
        access: [Role.ADMIN, Role.STAFF],
      },
      { method: 'delete', path: `/leads/${OID}`, access: [Role.ADMIN] },
    ],
  },
  {
    name: 'Invoice',
    routes: [
      { method: 'post', path: '/invoice', access: [Role.ADMIN, Role.STAFF] },
      {
        method: 'post',
        path: '/invoice/vechile',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/invoice/vechile/batch',
        access: [Role.ADMIN, Role.STAFF],
      },
      { method: 'get', path: '/invoice', access: [Role.ADMIN, Role.STAFF] },
      {
        method: 'get',
        path: '/invoice/vechile',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/invoice/purchase-documents',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/invoice/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/invoice/vechile/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/invoice/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/invoice/vechile/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/invoice/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/invoice/vechile/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/invoice/purchase-documents',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Inventory',
    routes: [
      { method: 'post', path: '/inventory', access: [Role.ADMIN, Role.STAFF] },
      { method: 'get', path: '/inventory', access: [Role.ADMIN, Role.STAFF] },
      {
        method: 'get',
        path: `/inventory/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/inventory/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      { method: 'delete', path: `/inventory/${OID}`, access: [Role.ADMIN] },
    ],
  },
  {
    name: 'DamageAdjustments',
    routes: [
      {
        method: 'post',
        path: '/damage-adjustments',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/damage-adjustments',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'AuthorizationLetter',
    routes: [
      {
        method: 'get',
        path: '/authorization-letters',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/authorization-letters/eligible-auctions',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/authorization-letters/auction/${OID}/eligibility`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/authorization-letters',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/authorization-letters/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/authorization-letters/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/authorization-letters/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/authorization-letters/${OID}/preview`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/authorization-letters/${OID}/pdf`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Accounting',
    routes: [
      {
        method: 'get',
        path: '/accounting/chart-of-accounts',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/accounting/ledger-entries',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/accounting/pnl',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: '/accounting/invoice-payments',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: '/accounting/invoice-payments',
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    name: 'Auction',
    routes: [
      { method: 'post', path: '/auctions', access: [Role.ADMIN, Role.STAFF] },
      { method: 'get', path: '/auctions', access: [Role.ADMIN, Role.STAFF] },
      {
        method: 'get',
        path: '/auctions/lookup',
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/lookup/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/${OID}/close-deal`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/${OID}/status`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/${OID}/cancel`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/${OID}/lots`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/${OID}/lots`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/lots/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/lots/${OID}/vehicles`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/lots/${OID}/vehicles/batch`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/lots/${OID}/vehicles`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/vehicles/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/vehicles/${OID}/images`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/vehicles/${OID}/images`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/auctions/lots/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/auctions/vehicles/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'delete',
        path: `/auctions/${OID}`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'get',
        path: `/auctions/${OID}/lifecycle`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/${OID}/lifecycle/outcome`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/lots/${OID}/payments`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/lots/${OID}/acceptance-letter`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/lots/${OID}/delivery`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'post',
        path: `/auctions/lots/${OID}/gate-pass`,
        access: [Role.ADMIN, Role.STAFF],
      },
      {
        method: 'patch',
        path: `/auctions/lots/${OID}/rcm`,
        access: [Role.ADMIN, Role.STAFF],
      },
    ],
  },
];

export const ALL_TEST_ROLES = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.STAFF,
] as const;

export function isRoleAllowed(access: RbacAccess, role: Role): boolean {
  if (access === 'PUBLIC') return true;
  if (access === 'JWT_ONLY') return true;
  return access.includes(role);
}

export function requiresAuth(access: RbacAccess): boolean {
  return access !== 'PUBLIC';
}
