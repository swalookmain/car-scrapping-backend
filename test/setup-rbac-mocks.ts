/**
 * Mocks all Nest services before controller modules load in RBAC e2e tests.
 * Prevents Mongoose schema initialization during test imports.
 */
function createMockService() {
  const fns: Record<string, jest.Mock> = {};
  return new Proxy(fns, {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      if (!fns[prop]) {
        fns[prop] = jest.fn().mockResolvedValue({});
      }
      return fns[prop];
    },
  });
}

function mockService(modulePath: string, exportName: string) {
  jest.mock(modulePath, () => ({
    [exportName]: jest.fn().mockImplementation(() => createMockService()),
  }));
}

const services: Array<[string, string]> = [
  ['../src/auth/auth.service', 'AuthService'],
  ['../src/users/users.service', 'UsersService'],
  ['../src/organizations/organizations.service', 'OrganizationsService'],
  ['../src/subscription/subscription.service', 'SubscriptionService'],
  ['../src/organizations/organization-letter-settings.service', 'OrganizationLetterSettingsService'],
  ['../src/audit-log/audit-log.service', 'AuditLogService'],
  ['../src/dashboard/dashboard.service', 'DashboardService'],
  ['../src/part-catalog/part-catalog.service', 'PartCatalogService'],
  ['../src/yard/yard.service', 'YardService'],
  ['../src/vehicle-compliance/vehicle-compliance.service', 'VehicleComplianceService'],
  ['../src/tax-compliance/tax-compliance.service', 'TaxComplianceService'],
  ['../src/sales-dispatch/sales-dispatch.service', 'SalesDispatchService'],
  ['../src/reports/reports.service', 'ReportsService'],
  ['../src/lead/lead.service', 'LeadService'],
  ['../src/invoice/invoice.service', 'InvoiceService'],
  ['../src/inventory/inventory.service', 'InventoryService'],
  ['../src/damage-adjustments/damage-adjustments.service', 'DamageAdjustmentsService'],
  ['../src/authorization-letter/authorization-letter.service', 'AuthorizationLetterService'],
  ['../src/accounting/services/chart-of-accounts.service', 'ChartOfAccountsService'],
  ['../src/accounting/repositories/ledger-entry.repository', 'LedgerEntryRepository'],
  ['../src/accounting/services/pnl.service', 'PnlService'],
  ['../src/accounting/services/invoice-payment.service', 'InvoicePaymentService'],
  ['../src/auction/auction.service', 'AuctionService'],
  ['../src/auction/lifecycle/lifecycle.service', 'LifecycleService'],
];

for (const [path, name] of services) {
  mockService(path, name);
}
