import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { GstAuditLog, GstAuditLogDocument } from './gst-audit-log.schema';

@Injectable()
export class GstAuditLogRepository extends BaseRepository<GstAuditLogDocument> {
  constructor(
    @InjectModel(GstAuditLog.name)
    private readonly gstAuditLogModel: Model<GstAuditLogDocument>,
  ) {
    super(gstAuditLogModel);
  }
}
