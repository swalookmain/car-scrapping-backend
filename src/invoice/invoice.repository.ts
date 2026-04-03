import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PopulateOptions, SortOrder, Types } from 'mongoose';
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
  private readonly userNamePopulate: PopulateOptions[] = [
    { path: 'createdBy', select: 'name' },
    { path: 'updatedBy', select: 'name' },
    { path: 'deletedBy', select: 'name' },
  ];

  private extractUserName(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : null;
  }

  private mapUserNames<T extends Record<string, unknown>>(invoice: T): T {
    return {
      ...invoice,
      createdBy: this.extractUserName(invoice.createdBy),
      updatedBy: this.extractUserName(invoice.updatedBy),
      deletedBy: this.extractUserName(invoice.deletedBy),
    };
  }

  constructor(
    @InjectModel(Invoice.name)
    invoiceModel: Model<InvoiceDocument>,
  ) {
    super(invoiceModel);
  }

  async findByIdWithUserNames(id: string) {
    const invoice = await this.model
      .findById(id)
      .populate(this.userNamePopulate)
      .lean()
      .exec();

    return invoice
      ? this.mapUserNames(invoice as unknown as Record<string, unknown>)
      : null;
  }

  async findPaginatedWithUserNames(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, SortOrder> = { createdAt: -1 },
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(this.userNamePopulate)
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: data.map((invoice) =>
        this.mapUserNames(invoice as unknown as Record<string, unknown>),
      ),
      total,
    };
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
