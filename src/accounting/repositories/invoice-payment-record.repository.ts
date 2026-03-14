import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  InvoicePaymentRecord,
  InvoicePaymentRecordDocument,
} from '../schemas/invoice-payment-record.schema';

@Injectable()
export class InvoicePaymentRecordRepository extends BaseRepository<InvoicePaymentRecordDocument> {
  constructor(
    @InjectModel(InvoicePaymentRecord.name)
    private readonly invoicePaymentRecordModel: Model<InvoicePaymentRecordDocument>,
  ) {
    super(invoicePaymentRecordModel);
  }

  async findByOrganizationAndInvoice(
    organizationId: string,
    invoiceType: string,
    invoiceId: string,
  ) {
    return this.invoicePaymentRecordModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        invoiceType,
        invoiceId: new Types.ObjectId(invoiceId),
      })
      .sort({ paymentDate: -1 })
      .lean();
  }
}
