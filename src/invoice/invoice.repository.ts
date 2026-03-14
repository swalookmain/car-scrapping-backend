import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './invoice.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

export interface GstTotalsResult {
  totalTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  rcmAmount: number;
}

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceDocument> {
  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
  ) {
    super(invoiceModel);
  }

  async getGstTotalsForPeriod(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<GstTotalsResult> {
    const result = await this.model.aggregate<{
      totalTaxable: number;
      cgst: number;
      sgst: number;
      igst: number;
      rcmAmount: number;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          purchaseDate: { $gte: fromDate, $lte: toDate },
          $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
        },
      },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$taxableAmount' },
          cgst: { $sum: '$cgstAmount' },
          sgst: { $sum: '$sgstAmount' },
          igst: { $sum: '$igstAmount' },
          rcmAmount: {
            $sum: { $cond: ['$reverseChargeApplicable', '$totalTaxAmount', 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalTaxable: 1,
          cgst: 1,
          sgst: 1,
          igst: 1,
          rcmAmount: 1,
        },
      },
    ]);
    const row = result[0];
    return {
      totalTaxable: row?.totalTaxable ?? 0,
      cgst: row?.cgst ?? 0,
      sgst: row?.sgst ?? 0,
      igst: row?.igst ?? 0,
      rcmAmount: row?.rcmAmount ?? 0,
    };
  }
}
