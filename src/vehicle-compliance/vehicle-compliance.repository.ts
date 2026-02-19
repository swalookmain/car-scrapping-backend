import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleCodRecord,
  VehicleCodRecordDocument,
} from './vehicle-cod-record.schema';

@Injectable()
export class VehicleComplianceRepository {
  constructor(
    @InjectModel(VehicleCodRecord.name)
    private readonly vehicleCodRecordModel: Model<VehicleCodRecordDocument>,
  ) {}

  async createVehicleCodRecord(vehicleCodData: Partial<VehicleCodRecord>) {
    return this.vehicleCodRecordModel.create(vehicleCodData);
  }

  async getVehicleCodRecordById(id: string) {
    return this.vehicleCodRecordModel.findById(id);
  }

  async getVehicleCodRecordByVehicleId(vehicleId: string) {
    return this.vehicleCodRecordModel.findOne({
      vehicleId: new Types.ObjectId(vehicleId),
    });
  }

  async updateVehicleCodRecord(
    id: string,
    updateData: Partial<VehicleCodRecord>,
  ) {
    return this.vehicleCodRecordModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }

  async hasGeneratedCodForVehicle(vehicleId: string) {
    return this.vehicleCodRecordModel.exists({
      vehicleId: new Types.ObjectId(vehicleId),
      codGenerated: true,
    });
  }

  async findVehicleCodRecords(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total]: [Array<Record<string, unknown>>, number] =
      await Promise.all([
        this.vehicleCodRecordModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<Array<Record<string, unknown>>>(),
        this.vehicleCodRecordModel.countDocuments(filter),
      ]);
    return { data, total };
  }
}
