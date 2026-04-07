import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  LeadDocumentRecord,
  LeadDocumentRecordDocument,
} from './lead-document.schema';

@Injectable()
export class LeadDocumentRepository extends BaseRepository<LeadDocumentRecordDocument> {
  constructor(
    @InjectModel(LeadDocumentRecord.name)
    leadDocumentModel: Model<LeadDocumentRecordDocument>,
  ) {
    super(leadDocumentModel);
  }

  findByLeadAndOrg(leadId: string, orgId: string) {
    return this.model
      .find({
        leadId: new Types.ObjectId(leadId),
        organizationId: new Types.ObjectId(orgId),
      })
      .sort({ createdAt: -1 });
  }

  async replaceDocument(
    filter: Record<string, unknown>,
    payload: Partial<LeadDocumentRecord>,
  ) {
    return this.model.findOneAndUpdate(filter, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }
}
