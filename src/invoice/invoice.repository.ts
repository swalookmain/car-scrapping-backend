import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './invoice.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceDocument> {
  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
  ) {
    super(invoiceModel);
  }
}
