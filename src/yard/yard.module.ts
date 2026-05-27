import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YardController } from './yard.controller';
import { YardService } from './yard.service';
import { YardZone, YardZoneSchema } from './yard-zone.schema';
import { YardVehicle, YardVehicleSchema } from './yard-vehicle.schema';
import { YardMovement, YardMovementSchema } from './yard-movement.schema';
import { YardZoneRepository } from './yard-zone.repository';
import { YardVehicleRepository } from './yard-vehicle.repository';
import { YardMovementRepository } from './yard-movement.repository';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YardZone.name, schema: YardZoneSchema },
      { name: YardVehicle.name, schema: YardVehicleSchema },
      { name: YardMovement.name, schema: YardMovementSchema },
    ]),
    forwardRef(() => InvoiceModule),
    AuditLogModule,
  ],
  controllers: [YardController],
  providers: [
    YardService,
    YardZoneRepository,
    YardVehicleRepository,
    YardMovementRepository,
  ],
  exports: [YardService],
})
export class YardModule {}
