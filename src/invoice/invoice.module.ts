import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { VehicleInvoiceRepository } from './vehicle-invoice.repository';
import { PurchaseDocumentRepository } from './purchase-document.repository';
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
import { VehicleComplianceModule } from 'src/vehicle-compliance/vehicle-compliance.module';
import { TaxComplianceModule } from 'src/tax-compliance/tax-compliance.module';

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
    forwardRef(() => VehicleComplianceModule),
    TaxComplianceModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceRepository,
    VehicleInvoiceRepository,
    PurchaseDocumentRepository,
    StorageService,
  ],
  exports: [
    InvoiceService,
    InvoiceRepository,
    VehicleInvoiceRepository,
    PurchaseDocumentRepository,
  ],
})
export class InvoiceModule {}
