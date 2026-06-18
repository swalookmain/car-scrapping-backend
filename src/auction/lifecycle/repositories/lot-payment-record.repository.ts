import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  LotPaymentRecord,
  LotPaymentRecordDocument,
} from '../schemas/lot-payment-record.schema';

@Injectable()
export class LotPaymentRecordRepository extends BaseRepository<LotPaymentRecordDocument> {
  constructor(
    @InjectModel(LotPaymentRecord.name)
    lotPaymentRecordModel: Model<LotPaymentRecordDocument>,
  ) {
    super(lotPaymentRecordModel);
  }

  async findByLot(organizationId: string, lotId: string) {
    return this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        lotId: new Types.ObjectId(lotId),
      })
      .sort({ createdAt: -1 });
  }
}
