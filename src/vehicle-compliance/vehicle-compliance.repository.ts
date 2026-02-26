import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleCodRecord,
  VehicleCodRecordDocument,
} from './vehicle-cod-record.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class VehicleComplianceRepository extends BaseRepository<VehicleCodRecordDocument> {
  constructor(
    @InjectModel(VehicleCodRecord.name)
    private readonly vehicleCodRecordModel: Model<VehicleCodRecordDocument>,
  ) {
    super(vehicleCodRecordModel);
  }

  async getVehicleCodRecordByVehicleId(vehicleId: string) {
    return this.vehicleCodRecordModel.findOne({
      vehicleId: new Types.ObjectId(vehicleId),
    });
  }

  async hasGeneratedCodForVehicle(vehicleId: string) {
    return this.vehicleCodRecordModel.exists({
      vehicleId: new Types.ObjectId(vehicleId),
      codGenerated: true,
    });
  }

}
