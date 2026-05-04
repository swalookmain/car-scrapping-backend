import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuctionCounter, AuctionCounterDocument } from './auction-counter.schema';

@Injectable()
export class AuctionCounterRepository {
  constructor(
    @InjectModel(AuctionCounter.name)
    private readonly auctionCounterModel: Model<AuctionCounterDocument>,
  ) {}

  async getNextSequence(organizationId: string, financialYear: string) {
    const counter = await this.auctionCounterModel
      .findOneAndUpdate(
        {
          organizationId: new Types.ObjectId(organizationId),
          financialYear,
        },
        {
          $inc: { sequence: 1 },
          $setOnInsert: {
            organizationId: new Types.ObjectId(organizationId),
            financialYear,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();
    return counter?.sequence ?? 1;
  }
}
