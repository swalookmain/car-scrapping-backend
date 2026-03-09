import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Buyer, BuyerDocument } from './buyer.schema';

@Injectable()
export class BuyerRepository extends BaseRepository<BuyerDocument> {
  constructor(
    @InjectModel(Buyer.name)
    private readonly buyerModel: Model<BuyerDocument>,
  ) {
    super(buyerModel);
  }

  async findByOrgAndId(organizationId: string, buyerId: string) {
    return this.buyerModel.findOne({
      _id: new Types.ObjectId(buyerId),
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
