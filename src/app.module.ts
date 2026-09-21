import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { jwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ModulesGuard } from './common/guards/modules.guard';
import { AccessModule } from './common/access/access.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ConfigModule } from './config/config.module';
import { MongoDbModule } from './database/mongodb/mongodb.module';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuditLogInterceptor } from './common/interceptor/audit-log.interceptor';
import { InvoiceModule } from './invoice/invoice.module';
import { InventoryModule } from './inventory/inventory.module';
import { VehicleComplianceModule } from './vehicle-compliance/vehicle-compliance.module';
import { SalesDispatchModule } from './sales-dispatch/sales-dispatch.module';
import { TaxComplianceModule } from './tax-compliance/tax-compliance.module';
import { DamageAdjustmentsModule } from './damage-adjustments/damage-adjustments.module';
import { ReportsModule } from './reports/reports.module';
import { AccountingModule } from './accounting/accounting.module';
import { LeadModule } from './lead/lead.module';
import { AuctionModule } from './auction/auction.module';
import { YardModule } from './yard/yard.module';
import { NotificationModule } from './notification/notification.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthorizationLetterModule } from './authorization-letter/authorization-letter.module';
import { PartCatalogModule } from './part-catalog/part-catalog.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MaterialMasterModule } from './material-master/material-master.module';
import { InventoryAuditModule } from './inventory-audit/inventory-audit.module';
import { LiftingModule } from './lifting/lifting.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    WinstonModule.forRoot(winstonConfig),
    StorageModule,
    AccessModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ConfigModule,
    MongoDbModule,
    AuditLogModule,
    InvoiceModule,
    InventoryModule,
    VehicleComplianceModule,
    SalesDispatchModule,
    TaxComplianceModule,
    DamageAdjustmentsModule,
    ReportsModule,
    AccountingModule,
    LeadModule,
    AuctionModule,
    YardModule,
    NotificationModule,
    SubscriptionModule,
    AuthorizationLetterModule,
    PartCatalogModule,
    DashboardModule,
    MaterialMasterModule,
    InventoryAuditModule,
    LiftingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditLogInterceptor,
    { provide: APP_GUARD, useClass: jwtAuthGuard },
    { provide: APP_GUARD, useClass: ModulesGuard },
  ],
})
export class AppModule {}
