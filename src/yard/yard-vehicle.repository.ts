import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { YardVehicle, YardVehicleDocument } from './yard-vehicle.schema';

@Injectable()
export class YardVehicleRepository extends BaseRepository<YardVehicleDocument> {
  constructor(
    @InjectModel(YardVehicle.name)
    yardVehicleModel: Model<YardVehicleDocument>,
  ) {
    super(yardVehicleModel);
  }

  /**
   * Migrates legacy unique/sparse vehicleInvoiceId indexes that treat null as a
   * value (only one auction-parked row allowed). Partial unique allows many
   * pre-invoice yard rows.
   */
  async ensureVehicleInvoicePartialUniqueIndex(): Promise<string[]> {
    const changed: string[] = [];

    const unsetResult = await this.model.updateMany(
      { vehicleInvoiceId: null },
      { $unset: { vehicleInvoiceId: '' } },
    );
    if (unsetResult.modifiedCount > 0) {
      changed.push(`unset-null:${unsetResult.modifiedCount}`);
    }

    const indexes = await this.model.collection.indexes();
    const desiredName = 'vehicleInvoiceId_partial_unique';

    for (const index of indexes) {
      const key = index.key as Record<string, number> | undefined;
      if (!key || key.vehicleInvoiceId !== 1) continue;
      if (Object.keys(key).length !== 1) continue;
      if (index.name === desiredName) continue;
      if (index.name) {
        await this.model.collection.dropIndex(index.name);
        changed.push(`dropped:${index.name}`);
      }
    }

    const remaining = await this.model.collection.indexes();
    const hasDesired = remaining.some((index) => index.name === desiredName);
    if (!hasDesired) {
      await this.model.collection.createIndex(
        { vehicleInvoiceId: 1 },
        {
          unique: true,
          name: desiredName,
          partialFilterExpression: {
            vehicleInvoiceId: { $exists: true, $type: 'objectId' },
          },
        },
      );
      changed.push(`created:${desiredName}`);
    }

    return changed;
  }

  findByVehicleInvoiceId(vehicleInvoiceId: string) {
    return this.model.findOne({
      vehicleInvoiceId: new Types.ObjectId(vehicleInvoiceId),
    });
  }

  findByAuctionVehicleId(organizationId: string, auctionVehicleId: string) {
    return this.model.findOne({
      organizationId: new Types.ObjectId(organizationId),
      auctionVehicleId: new Types.ObjectId(auctionVehicleId),
    });
  }

  findByAuctionVehicleIds(organizationId: string, auctionVehicleIds: string[]) {
    if (!auctionVehicleIds.length) return Promise.resolve([]);
    return this.model.find({
      organizationId: new Types.ObjectId(organizationId),
      auctionVehicleId: {
        $in: auctionVehicleIds.map((id) => new Types.ObjectId(id)),
      },
    });
  }

  findByLeadId(organizationId: string, leadId: string) {
    return this.model.findOne({
      organizationId: new Types.ObjectId(organizationId),
      leadId: new Types.ObjectId(leadId),
    });
  }

  countByStatus(organizationId: string, status: string) {
    return this.model.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      currentStatus: status,
    });
  }
}
