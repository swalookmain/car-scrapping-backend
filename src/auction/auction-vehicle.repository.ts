import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { AuctionVehicle, AuctionVehicleDocument } from './auction-vehicle.schema';

@Injectable()
export class AuctionVehicleRepository extends BaseRepository<AuctionVehicleDocument> {
  constructor(
    @InjectModel(AuctionVehicle.name)
    auctionVehicleModel: Model<AuctionVehicleDocument>,
  ) {
    super(auctionVehicleModel);
  }

  async findByLot(organizationId: string, lotId: string) {
    return this.findAllByFilter({
      organizationId: new Types.ObjectId(organizationId),
      lotId: new Types.ObjectId(lotId),
    });
  }

  async findByAuction(organizationId: string, auctionId: string) {
    return this.findAllByFilter({
      organizationId: new Types.ObjectId(organizationId),
      auctionId: new Types.ObjectId(auctionId),
    });
  }
}
