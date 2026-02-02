import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from './invoice.schema';
import { VechileInvoice, VechileInvoiceSchema } from './vechile-invoice.schema';
import {
  DirectSeller,
  DirectSellerSchema,
} from './direct-seller.schema';
import {
  MSTCSeller,
  MSTCSellerSchema,
} from './MSTC-seller.schema';
import {
  Gemseller,
  GemsellerSchema,
} from './Gem-seller.schema';
import {
  PurchaseDocument,
  PurchaseDocumentSchema,
} from './purchase-document.schema';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { StorageService } from 'src/common/services/storage.service';
import { SellerType } from 'src/common/enum/sellerType.enum';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Invoice.name,
        schema: InvoiceSchema,
        discriminators: [
          {
            name: DirectSeller.name,
            schema: DirectSellerSchema,
            value: SellerType.DIRECT,
          },
          {
            name: MSTCSeller.name,
            schema: MSTCSellerSchema,
            value: SellerType.MSTC,
          },
          {
            name: Gemseller.name,
            schema: GemsellerSchema,
            value: SellerType.GEM,
          },
        ],
      },
      { name: VechileInvoice.name, schema: VechileInvoiceSchema },
      { name: PurchaseDocument.name, schema: PurchaseDocumentSchema },
    ]),
    OrganizationsModule,
    AuditLogModule,
    
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository, StorageService],
  exports: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
