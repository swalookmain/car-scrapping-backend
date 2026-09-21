import { Type, Provider } from '@nestjs/common';
import { createServiceMock } from './service-mock';
import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { AccessController } from '../../src/common/access/access.controller';
import { OrganizationsController } from '../../src/organizations/organizations.controller';
import { OrganizationsService } from '../../src/organizations/organizations.service';
import { SubscriptionService } from '../../src/subscription/subscription.service';
import { OrganizationLetterSettingsService } from '../../src/organizations/organization-letter-settings.service';
import { OrganizationFacilitySettingsService } from '../../src/organizations/organization-facility-settings.service';
import { AuditLogController } from '../../src/audit-log/audit-log.controller';
import { AuditLogService } from '../../src/audit-log/audit-log.service';
import { DashboardController } from '../../src/dashboard/dashboard.controller';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { PartCatalogController } from '../../src/part-catalog/part-catalog.controller';
import { PartCatalogService } from '../../src/part-catalog/part-catalog.service';
import { YardController } from '../../src/yard/yard.controller';
import { YardService } from '../../src/yard/yard.service';
import { LiftingController } from '../../src/lifting/lifting.controller';
import { LiftingService } from '../../src/lifting/lifting.service';
import { VehicleComplianceController } from '../../src/vehicle-compliance/vehicle-compliance.controller';
import { VehicleComplianceService } from '../../src/vehicle-compliance/vehicle-compliance.service';
import { TaxComplianceController } from '../../src/tax-compliance/tax-compliance.controller';
import { TaxComplianceService } from '../../src/tax-compliance/tax-compliance.service';
import { SalesDispatchController } from '../../src/sales-dispatch/sales-dispatch.controller';
import { SalesDispatchService } from '../../src/sales-dispatch/sales-dispatch.service';
import { ReportsController } from '../../src/reports/reports.controller';
import { ReportsService } from '../../src/reports/reports.service';
import { LeadController } from '../../src/lead/lead.controller';
import { LeadService } from '../../src/lead/lead.service';
import { InvoiceController } from '../../src/invoice/invoice.controller';
import { InvoiceService } from '../../src/invoice/invoice.service';
import { InventoryController } from '../../src/inventory/inventory.controller';
import { InventoryService } from '../../src/inventory/inventory.service';
import { DamageAdjustmentsController } from '../../src/damage-adjustments/damage-adjustments.controller';
import { DamageAdjustmentsService } from '../../src/damage-adjustments/damage-adjustments.service';
import { AuthorizationLetterController } from '../../src/authorization-letter/authorization-letter.controller';
import { AuthorizationLetterService } from '../../src/authorization-letter/authorization-letter.service';
import { AccountingController } from '../../src/accounting/accounting.controller';
import { ChartOfAccountsService } from '../../src/accounting/services/chart-of-accounts.service';
import { LedgerEntryRepository } from '../../src/accounting/repositories/ledger-entry.repository';
import { PnlService } from '../../src/accounting/services/pnl.service';
import { InvoicePaymentService } from '../../src/accounting/services/invoice-payment.service';
import { AuctionController } from '../../src/auction/auction.controller';
import { AuctionService } from '../../src/auction/auction.service';
import { LifecycleController } from '../../src/auction/lifecycle/lifecycle.controller';
import { LifecycleService } from '../../src/auction/lifecycle/lifecycle.service';

function svc<T>(token: Type<T>): Provider {
  return { provide: token, useValue: createServiceMock() };
}

export interface RbacModuleSetup {
  controllers: Type<unknown>[];
  providers: Provider[];
}

export const RBAC_MODULE_SETUPS: Record<string, RbacModuleSetup> = {
  App: {
    controllers: [AppController],
    providers: [AppService],
  },
  Auth: {
    controllers: [AuthController],
    providers: [svc(AuthService)],
  },
  Users: {
    controllers: [UsersController],
    providers: [svc(UsersService)],
  },
  Access: {
    controllers: [AccessController],
    providers: [],
  },
  Organizations: {
    controllers: [OrganizationsController],
    providers: [
      svc(OrganizationsService),
      svc(SubscriptionService),
      svc(OrganizationLetterSettingsService),
      svc(OrganizationFacilitySettingsService),
    ],
  },
  AuditLog: {
    controllers: [AuditLogController],
    providers: [svc(AuditLogService)],
  },
  Dashboard: {
    controllers: [DashboardController],
    providers: [svc(DashboardService)],
  },
  PartCatalog: {
    controllers: [PartCatalogController],
    providers: [svc(PartCatalogService)],
  },
  Yard: {
    controllers: [YardController],
    providers: [svc(YardService)],
  },
  Lifting: {
    controllers: [LiftingController],
    providers: [svc(LiftingService)],
  },
  VehicleCompliance: {
    controllers: [VehicleComplianceController],
    providers: [svc(VehicleComplianceService)],
  },
  TaxCompliance: {
    controllers: [TaxComplianceController],
    providers: [svc(TaxComplianceService)],
  },
  SalesDispatch: {
    controllers: [SalesDispatchController],
    providers: [svc(SalesDispatchService)],
  },
  Reports: {
    controllers: [ReportsController],
    providers: [svc(ReportsService)],
  },
  Lead: {
    controllers: [LeadController],
    providers: [svc(LeadService)],
  },
  Invoice: {
    controllers: [InvoiceController],
    providers: [svc(InvoiceService)],
  },
  Inventory: {
    controllers: [InventoryController],
    providers: [svc(InventoryService)],
  },
  DamageAdjustments: {
    controllers: [DamageAdjustmentsController],
    providers: [svc(DamageAdjustmentsService)],
  },
  AuthorizationLetter: {
    controllers: [AuthorizationLetterController],
    providers: [svc(AuthorizationLetterService)],
  },
  Accounting: {
    controllers: [AccountingController],
    providers: [
      svc(ChartOfAccountsService),
      svc(LedgerEntryRepository),
      svc(PnlService),
      svc(InvoicePaymentService),
    ],
  },
  Auction: {
    controllers: [AuctionController, LifecycleController],
    providers: [svc(AuctionService), svc(LifecycleService)],
  },
};
