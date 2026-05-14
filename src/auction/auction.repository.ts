import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Auction, AuctionDocument } from './auction.schema';

@Injectable()
export class AuctionRepository extends BaseRepository<AuctionDocument> {
  constructor(@InjectModel(Auction.name) auctionModel: Model<AuctionDocument>) {
    super(auctionModel);
  }

  async dropLegacyAuctionCodeIndexes() {
    const indexes = await this.model.collection.indexes();
    const legacyIndexes = indexes.filter((index) =>
      Object.prototype.hasOwnProperty.call(index.key ?? {}, 'auctionCode'),
    );

    for (const index of legacyIndexes) {
      if (index.name) {
        await this.model.collection.dropIndex(index.name);
      }
    }

    return legacyIndexes.map((index) => index.name).filter(Boolean);
  }

  async findByOrgAndId(organizationId: string, id: string) {
    return this.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
