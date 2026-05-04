import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { AuctionLot, AuctionLotDocument } from './auction-lot.schema';

@Injectable()
export class AuctionLotRepository extends BaseRepository<AuctionLotDocument> {
  constructor(@InjectModel(AuctionLot.name) auctionLotModel: Model<AuctionLotDocument>) {
    super(auctionLotModel);
  }

  async findByAuction(organizationId: string, auctionId: string) {
    return this.findAllByFilter({
      organizationId: new Types.ObjectId(organizationId),
      auctionId: new Types.ObjectId(auctionId),
    });
  }

  async findByOrgAndId(organizationId: string, id: string) {
    return this.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
