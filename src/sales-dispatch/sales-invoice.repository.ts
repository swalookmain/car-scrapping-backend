import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { SalesInvoice, SalesInvoiceDocument } from './sales-invoice.schema';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';

export interface GstTotalsResult {
  totalTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  rcmAmount: number;
}

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

  async getGstTotalsForPeriod(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<GstTotalsResult> {
    const result = await this.salesInvoiceModel.aggregate<{
      totalTaxable: number;
      cgst: number;
      sgst: number;
      igst: number;
      rcmAmount: number;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          invoiceDate: { $gte: fromDate, $lte: toDate },
          status: { $ne: SalesInvoiceStatus.CANCELLED },
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
