import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  SalesInvoiceItem,
  SalesInvoiceItemDocument,
} from './sales-invoice-item.schema';

@Injectable()
export class SalesInvoiceItemRepository extends BaseRepository<SalesInvoiceItemDocument> {
  constructor(
    @InjectModel(SalesInvoiceItem.name)
    private readonly salesInvoiceItemModel: Model<SalesInvoiceItemDocument>,
  ) {
    super(salesInvoiceItemModel);
  }

  async createMany(items: Partial<SalesInvoiceItem>[]) {
    return this.salesInvoiceItemModel.insertMany(items);
  }

  async findBySalesInvoiceId(salesInvoiceId: string) {
    return this.salesInvoiceItemModel.find({
      salesInvoiceId: new Types.ObjectId(salesInvoiceId),
    });
  }

  async deleteBySalesInvoiceId(salesInvoiceId: string) {
    return this.salesInvoiceItemModel.deleteMany({
      salesInvoiceId: new Types.ObjectId(salesInvoiceId),
    });
  }
}
