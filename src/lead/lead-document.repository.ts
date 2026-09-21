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

  async findTypesByLeadIds(organizationId: string, leadIds: string[]) {
    const map = new Map<string, Array<{ documentType: string }>>();
    if (leadIds.length === 0) {
      return map;
    }
    const rows = await this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        leadId: { $in: leadIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('leadId documentType')
      .lean()
      .exec();
    for (const row of rows) {
      const id = String(row.leadId);
      const list = map.get(id) || [];
      list.push({ documentType: row.documentType });
      map.set(id, list);
    }
    return map;
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
