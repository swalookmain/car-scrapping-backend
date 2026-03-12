import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesInvoice, SalesInvoiceSchema } from 'src/sales-dispatch/sales-invoice.schema';
import { TaxComplianceController } from './tax-compliance.controller';
import { TaxComplianceService } from './tax-compliance.service';
import { TaxEngineService } from './tax-engine.service';
import { GstAuditService } from './gst-audit.service';
import { TaxConfig, TaxConfigSchema } from './tax-config.schema';
import {
  EwayBillRecord,
  EwayBillRecordSchema,
} from './eway-bill-record.schema';
import { GstAuditLog, GstAuditLogSchema } from './gst-audit-log.schema';
import { TaxConfigRepository } from './tax-config.repository';
import { EwayBillRecordRepository } from './eway-bill-record.repository';
import { GstAuditLogRepository } from './gst-audit-log.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaxConfig.name, schema: TaxConfigSchema },
      { name: EwayBillRecord.name, schema: EwayBillRecordSchema },
      { name: GstAuditLog.name, schema: GstAuditLogSchema },
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
    ]),
  ],
  controllers: [TaxComplianceController],
  providers: [
    TaxComplianceService,
    TaxEngineService,
    GstAuditService,
    TaxConfigRepository,
    EwayBillRecordRepository,
    GstAuditLogRepository,
  ],
  exports: [TaxComplianceService, TaxEngineService, GstAuditService, TaxConfigRepository],
})
export class TaxComplianceModule {}
