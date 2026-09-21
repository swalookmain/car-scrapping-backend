import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory, InventorySchema } from './inventory.schema';
import { InventoryRepository } from './inventory.repository';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { YardModule } from 'src/yard/yard.module';
import { MaterialMasterModule } from 'src/material-master/material-master.module';
import { PartCatalogModule } from 'src/part-catalog/part-catalog.module';
import { LeadModule } from 'src/lead/lead.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
    ]),
    InvoiceModule,
    forwardRef(() => YardModule),
    MaterialMasterModule,
    PartCatalogModule,
    LeadModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
