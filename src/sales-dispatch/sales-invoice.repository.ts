import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { SalesInvoice, SalesInvoiceDocument } from './sales-invoice.schema';

@Injectable()
export class SalesInvoiceRepository extends BaseRepository<SalesInvoiceDocument> {
  constructor(
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
  ) {
    super(salesInvoiceModel);
  }

  async findByOrgAndId(organizationId: string, salesInvoiceId: string) {
    return this.salesInvoiceModel.findOne({
      _id: new Types.ObjectId(salesInvoiceId),
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
