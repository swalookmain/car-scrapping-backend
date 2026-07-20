import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inventory, InventorySchema } from 'src/inventory/inventory.schema';
import {
  VechileInvoice,
  VechileInvoiceSchema,
} from 'src/invoice/vechile-invoice.schema';
import { YardVehicle, YardVehicleSchema } from 'src/yard/yard-vehicle.schema';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { InventoryAuditService } from './inventory-audit.service';
import { InventoryAuditController } from './inventory-audit.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: VechileInvoice.name, schema: VechileInvoiceSchema },
      { name: YardVehicle.name, schema: YardVehicleSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [InventoryAuditController],
  providers: [InventoryAuditService],
  exports: [InventoryAuditService],
})
export class InventoryAuditModule {}
