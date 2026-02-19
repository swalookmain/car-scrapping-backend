import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import {
  VehicleCodRecord,
  VehicleCodRecordSchema,
} from './vehicle-cod-record.schema';
import { VehicleComplianceService } from './vehicle-compliance.service';
import { VehicleComplianceController } from './vehicle-compliance.controller';
import { VehicleComplianceRepository } from './vehicle-compliance.repository';
import { InvoiceModule } from 'src/invoice/invoice.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleCodRecord.name, schema: VehicleCodRecordSchema },
    ]),
    OrganizationsModule,
    forwardRef(() => InvoiceModule),
  ],
  controllers: [VehicleComplianceController],
  providers: [VehicleComplianceService, VehicleComplianceRepository],
  exports: [VehicleComplianceService, VehicleComplianceRepository],
})
export class VehicleComplianceModule {}
