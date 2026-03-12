import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DamageAdjustmentsController } from './damage-adjustments.controller';
import { DamageAdjustmentsService } from './damage-adjustments.service';
import {
  DamageAdjustment,
  DamageAdjustmentSchema,
} from './damage-adjustment.schema';
import { DamageAdjustmentRepository } from './damage-adjustment.repository';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DamageAdjustment.name, schema: DamageAdjustmentSchema },
    ]),
    InventoryModule,
  ],
  controllers: [DamageAdjustmentsController],
  providers: [DamageAdjustmentsService, DamageAdjustmentRepository],
  exports: [DamageAdjustmentsService],
})
export class DamageAdjustmentsModule {}

