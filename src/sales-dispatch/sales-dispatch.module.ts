import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Buyer, BuyerSchema } from './buyer.schema';
import { SalesInvoice, SalesInvoiceSchema } from './sales-invoice.schema';
import {
  SalesInvoiceItem,
  SalesInvoiceItemSchema,
} from './sales-invoice-item.schema';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from './inventory-movement.schema';
import { SalesDispatchController } from './sales-dispatch.controller';
import { SalesDispatchService } from './sales-dispatch.service';
import { BuyerRepository } from './buyer.repository';
import { SalesInvoiceRepository } from './sales-invoice.repository';
import { SalesInvoiceItemRepository } from './sales-invoice-item.repository';
import { InventoryMovementRepository } from './inventory-movement.repository';
import { InventoryModule } from 'src/inventory/inventory.module';
import { VehicleComplianceModule } from 'src/vehicle-compliance/vehicle-compliance.module';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { TaxComplianceModule } from 'src/tax-compliance/tax-compliance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Buyer.name, schema: BuyerSchema },
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: SalesInvoiceItem.name, schema: SalesInvoiceItemSchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
    ]),
    InventoryModule,
    VehicleComplianceModule,
    InvoiceModule,
    TaxComplianceModule,
  ],
  controllers: [SalesDispatchController],
  providers: [
    SalesDispatchService,
    BuyerRepository,
    SalesInvoiceRepository,
    SalesInvoiceItemRepository,
    InventoryMovementRepository,
  ],
  exports: [SalesDispatchService],
})
export class SalesDispatchModule {}
