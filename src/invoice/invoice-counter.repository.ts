import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceCounter, InvoiceCounterDocument } from './invoice-counter.schema';

@Injectable()
export class InvoiceCounterRepository {
  constructor(
    @InjectModel(InvoiceCounter.name)
    private readonly invoiceCounterModel: Model<InvoiceCounterDocument>,
  ) {}

  async getNextSequence(organizationId: string, financialYear: string) {
    const counter = await this.invoiceCounterModel
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
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean()
      .exec();

    return counter?.sequence ?? 1;
  }
}
