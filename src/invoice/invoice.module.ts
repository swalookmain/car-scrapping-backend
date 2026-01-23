import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from './invoice.schema';
import { VechileInvoice, VechileInvoiceSchema } from './vechile-invoice.schema';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: VechileInvoice.name, schema: VechileInvoiceSchema },
    ]),
    OrganizationsModule,
    AuditLogModule,
    
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository],
  exports: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
