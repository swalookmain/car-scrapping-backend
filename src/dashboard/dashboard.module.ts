import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Lead, LeadSchema } from 'src/lead/lead.schema';
import { Auction, AuctionSchema } from 'src/auction/auction.schema';
import { YardVehicle, YardVehicleSchema } from 'src/yard/yard-vehicle.schema';
import { Invoice, InvoiceSchema } from 'src/invoice/invoice.schema';
import {
  SalesInvoice,
  SalesInvoiceSchema,
} from 'src/sales-dispatch/sales-invoice.schema';
import {
  VehicleCodRecord,
  VehicleCodRecordSchema,
} from 'src/vehicle-compliance/vehicle-cod-record.schema';
import { Inventory, InventorySchema } from 'src/inventory/inventory.schema';
import {
  organizations,
  organizationsSchema,
} from 'src/organizations/organizations.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: organizations.name, schema: organizationsSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Auction.name, schema: AuctionSchema },
      { name: YardVehicle.name, schema: YardVehicleSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: VehicleCodRecord.name, schema: VehicleCodRecordSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
