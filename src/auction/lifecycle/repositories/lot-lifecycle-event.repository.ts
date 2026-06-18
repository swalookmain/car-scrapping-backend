import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  LotLifecycleEvent,
  LotLifecycleEventDocument,
} from '../schemas/lot-lifecycle-event.schema';

@Injectable()
export class LotLifecycleEventRepository extends BaseRepository<LotLifecycleEventDocument> {
  constructor(
    @InjectModel(LotLifecycleEvent.name)
    lotLifecycleEventModel: Model<LotLifecycleEventDocument>,
  ) {
    super(lotLifecycleEventModel);
  }

  async findByLot(organizationId: string, lotId: string) {
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        lotId: new Types.ObjectId(lotId),
      })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async findByAuction(organizationId: string, auctionId: string) {
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        auctionId: new Types.ObjectId(auctionId),
      })
      .sort({ createdAt: -1 })
      .limit(200);
  }
}
