import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { LedgerReferenceType } from 'src/common/enum/ledgerReferenceType.enum';
import {
  LedgerEntry,
  LedgerEntryDocument,
} from '../schemas/ledger-entry.schema';

@Injectable()
export class LedgerEntryRepository extends BaseRepository<LedgerEntryDocument> {
  constructor(
    @InjectModel(LedgerEntry.name)
    private readonly ledgerEntryModel: Model<LedgerEntryDocument>,
  ) {
    super(ledgerEntryModel);
  }

  async createMany(
    entries: Array<{
      organizationId: Types.ObjectId;
      accountId: Types.ObjectId;
      debitAmount: number;
      creditAmount: number;
      referenceType: LedgerReferenceType;
      referenceId: Types.ObjectId;
    }>,
  ) {
    if (entries.length === 0) return [];
    return this.ledgerEntryModel.insertMany(entries);
  }

  async hasEntriesForReference(
    organizationId: string,
    referenceType: LedgerReferenceType,
    referenceId: string,
  ): Promise<boolean> {
    const exists = await this.ledgerEntryModel.exists({
      organizationId: new Types.ObjectId(organizationId),
      referenceType,
      referenceId: new Types.ObjectId(referenceId),
    });
    return !!exists;
  }

  async findByOrganization(
    organizationId: string,
    options: {
      fromDate?: Date;
      toDate?: Date;
      accountId?: string;
      referenceType?: LedgerReferenceType;
      limit?: number;
      skip?: number;
    } = {},
  ) {
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (options.fromDate || options.toDate) {
      filter.createdAt = {};
      if (options.fromDate) (filter.createdAt as Record<string, Date>).$gte = options.fromDate;
      if (options.toDate) (filter.createdAt as Record<string, Date>).$lte = options.toDate;
    }
    if (options.accountId) filter.accountId = new Types.ObjectId(options.accountId);
    if (options.referenceType) filter.referenceType = options.referenceType;

    const query = this.ledgerEntryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    if (options.skip != null) query.skip(options.skip);
    if (options.limit != null) query.limit(options.limit);
    return query;
  }
}
