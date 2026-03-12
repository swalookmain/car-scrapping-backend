import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  EwayBillRecord,
  EwayBillRecordDocument,
} from './eway-bill-record.schema';

@Injectable()
export class EwayBillRecordRepository extends BaseRepository<EwayBillRecordDocument> {
  constructor(
    @InjectModel(EwayBillRecord.name)
    private readonly ewayBillRecordModel: Model<EwayBillRecordDocument>,
  ) {
    super(ewayBillRecordModel);
  }

  async findByOrgAndSalesInvoice(organizationId: string, salesInvoiceId: string) {
    return this.ewayBillRecordModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      salesInvoiceId: new Types.ObjectId(salesInvoiceId),
    });
  }
}
