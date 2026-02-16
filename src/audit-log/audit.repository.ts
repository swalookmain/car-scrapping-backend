import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit.schema';
import { AuditAction } from 'src/common/enum/audit.enum';
import { Types } from 'mongoose';

export interface AuditLogFilter {
  actorId?: string | Types.ObjectId;
  organizationId?: string | Types.ObjectId;
  action?: AuditAction;
  resource?: string;
  resourceId?: string | Types.ObjectId;
  status?: 'SUCCESS' | 'FAILURE';
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(auditLogData: Partial<AuditLog>): Promise<AuditLogDocument> {
    return this.auditLogModel.create(auditLogData);
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    return this.auditLogModel.findById(id);
  }

  async findAll(): Promise<AuditLogDocument[]> {
    return this.auditLogModel.find().sort({ createdAt: -1 });
  }

  async findByActorId(actorId: string): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ actorId: this.normalizeId(actorId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ organizationId: this.normalizeId(organizationId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByAction(action: AuditAction): Promise<AuditLogDocument[]> {
    return this.auditLogModel.find({ action }).sort({ createdAt: -1 }).exec();
  }

  async findByResource(
    resource: string,
    resourceId?: string,
  ): Promise<AuditLogDocument[]> {
    const query: Record<string, unknown> = { resource };
    if (resourceId) {
      query.resourceId = this.normalizeId(resourceId);
    }
    return this.auditLogModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByStatus(
    status: 'SUCCESS' | 'FAILURE',
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel.find({ status }).sort({ createdAt: -1 }).exec();
  }

  async findWithFilters(filter: AuditLogFilter): Promise<AuditLogDocument[]> {
    const query: Record<string, unknown> = {};

    if (filter.actorId) {
      query.actorId = this.normalizeId(filter.actorId);
    }
    if (filter.organizationId) {
      query.organizationId = this.normalizeId(filter.organizationId);
    }
    if (filter.action) {
      query.action = filter.action;
    }
    if (filter.resource) {
      query.resource = filter.resource;
    }
    if (filter.resourceId) {
      query.resourceId = this.normalizeId(filter.resourceId);
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (filter.startDate) {
        dateFilter.$gte = filter.startDate;
      }
      if (filter.endDate) {
        dateFilter.$lte = filter.endDate;
      }
      query.createdAt = dateFilter;
    }

    return this.auditLogModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findPaginated(
    filter: AuditLogFilter,
    page: number,
    limit: number,
  ): Promise<{ data: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filter.actorId) {
      query.actorId = this.normalizeId(filter.actorId);
    }
    if (filter.organizationId) {
      query.organizationId = this.normalizeId(filter.organizationId);
    }
    if (filter.action) {
      query.action = filter.action;
    }
    if (filter.resource) {
      query.resource = filter.resource;
    }
    if (filter.resourceId) {
      query.resourceId = this.normalizeId(filter.resourceId);
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (filter.startDate) {
        dateFilter.$gte = filter.startDate;
      }
      if (filter.endDate) {
        dateFilter.$lte = filter.endDate;
      }
      query.createdAt = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.auditLogModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async count(filter: AuditLogFilter): Promise<number> {
    const query: Record<string, unknown> = {};

    if (filter.actorId) {
      query.actorId = this.normalizeId(filter.actorId);
    }
    if (filter.organizationId) {
      query.organizationId = this.normalizeId(filter.organizationId);
    }
    if (filter.action) {
      query.action = filter.action;
    }
    if (filter.resource) {
      query.resource = filter.resource;
    }
    if (filter.resourceId) {
      query.resourceId = this.normalizeId(filter.resourceId);
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.startDate || filter.endDate) {
      query.createdAt = {} as Record<string, unknown>;
      if (filter.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = filter.startDate;
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = filter.endDate;
      }
    }

    return this.auditLogModel.countDocuments(query);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.auditLogModel.deleteMany({
      expireAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }

  private normalizeId(value?: string | Types.ObjectId) {
    if (!value) {
      return value;
    }
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
      return new Types.ObjectId(value);
    }
    return value;
  }
}
