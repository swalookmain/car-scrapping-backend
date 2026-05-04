import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  AuctionVehicleDocumentRecord,
  AuctionVehicleDocumentRecordDocument,
  AuctionVehicleImageType,
} from './auction-vehicle-document.schema';

@Injectable()
export class AuctionVehicleDocumentRepository extends BaseRepository<AuctionVehicleDocumentRecordDocument> {
  constructor(
    @InjectModel(AuctionVehicleDocumentRecord.name)
    auctionVehicleDocumentModel: Model<AuctionVehicleDocumentRecordDocument>,
  ) {
    super(auctionVehicleDocumentModel);
  }

  async replaceDocument(
    vehicleId: string,
    documentType: AuctionVehicleImageType,
    data: Partial<AuctionVehicleDocumentRecordDocument>,
  ) {
    return this.model
      .findOneAndUpdate(
        { vehicleId: new Types.ObjectId(vehicleId), documentType },
        data,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findByVehicle(vehicleId: string, organizationId: string) {
    return this.findAllByFilter({
      vehicleId: new Types.ObjectId(vehicleId),
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
