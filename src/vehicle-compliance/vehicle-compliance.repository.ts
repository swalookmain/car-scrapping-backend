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

  /**
   * Drop legacy unique vehicleId indexes that treat missing invoice vehicles
   * as a single null key. Partial unique allows many COD rows without invoice.
   */
  async ensureVehicleIdPartialUniqueIndex(): Promise<string[]> {
    const changed: string[] = [];
    const unsetResult = await this.vehicleCodRecordModel.updateMany(
      { vehicleId: null },
      { $unset: { vehicleId: '' } },
    );
    if (unsetResult.modifiedCount > 0) {
      changed.push(`unset-null-vehicleId:${unsetResult.modifiedCount}`);
    }
    const unsetInvoice = await this.vehicleCodRecordModel.updateMany(
      { invoiceId: null },
      { $unset: { invoiceId: '' } },
    );
    if (unsetInvoice.modifiedCount > 0) {
      changed.push(`unset-null-invoiceId:${unsetInvoice.modifiedCount}`);
    }

    const indexes = await this.vehicleCodRecordModel.collection.indexes();
    const desiredName = 'vehicleId_partial_unique';
    for (const index of indexes) {
      const key = index.key as Record<string, number> | undefined;
      if (!key || key.vehicleId !== 1) continue;
      if (Object.keys(key).length !== 1) continue;
      if (index.name === desiredName) continue;
      if (index.name) {
        await this.vehicleCodRecordModel.collection.dropIndex(index.name);
        changed.push(`dropped:${index.name}`);
      }
    }
    const remaining = await this.vehicleCodRecordModel.collection.indexes();
    if (!remaining.some((index) => index.name === desiredName)) {
      await this.vehicleCodRecordModel.collection.createIndex(
        { vehicleId: 1 },
        {
          unique: true,
          name: desiredName,
          partialFilterExpression: {
            vehicleId: { $exists: true, $type: 'objectId' },
          },
        },
      );
      changed.push(`created:${desiredName}`);
    }
    return changed;
  }

  async getVehicleCodRecordByVehicleId(vehicleId: string) {
    return this.vehicleCodRecordModel.findOne({
      vehicleId: new Types.ObjectId(vehicleId),
    });
  }

  async getVehicleCodRecordByYardVehicleId(yardVehicleId: string) {
    return this.vehicleCodRecordModel.findOne({
      yardVehicleId: new Types.ObjectId(yardVehicleId),
    });
  }

  async hasGeneratedCodForVehicle(vehicleId: string) {
    return this.vehicleCodRecordModel.exists({
      vehicleId: new Types.ObjectId(vehicleId),
      codGenerated: true,
    });
  }

  async hasGeneratedCodForYardVehicle(yardVehicleId: string) {
    return this.vehicleCodRecordModel.exists({
      yardVehicleId: new Types.ObjectId(yardVehicleId),
      codGenerated: true,
    });
  }
}
