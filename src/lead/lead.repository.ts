import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PopulateOptions, SortOrder, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Lead, LeadDocument } from './lead.schema';

@Injectable()
export class LeadRepository extends BaseRepository<LeadDocument> {
  private readonly userPopulate: PopulateOptions[] = [
    { path: 'assignedTo', select: 'name email phoneNumber role' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' },
    { path: 'closedBy', select: 'name email' },
  ];

  constructor(
    @InjectModel(Lead.name)
    leadModel: Model<LeadDocument>,
  ) {
    super(leadModel);
  }

  async findPaginatedWithUsers(
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
        .populate(this.userPopulate)
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findByIdWithUsers(id: string) {
    return this.model.findById(id).populate(this.userPopulate).lean().exec();
  }

  async findOwnedLeadIds(organizationId: string, userId: string) {
    const staffId = new Types.ObjectId(userId);
    const rows = await this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        $or: [{ createdBy: staffId }, { assignedTo: staffId }],
      })
      .select('_id')
      .lean()
      .exec();
    return rows.map((row) => row._id as Types.ObjectId);
  }

  async findLookupCandidates(
    organizationId: string,
    q: string | undefined,
    ownerUserId?: string,
  ) {
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      status: 'CLOSED',
      isInterested: { $ne: false },
      $or: [{ invoiceId: { $exists: false } }, { invoiceId: null }],
    };

    if (ownerUserId) {
      const staffId = new Types.ObjectId(ownerUserId);
      filter.$and = [
        { $or: [{ assignedTo: staffId }, { createdBy: staffId }] },
      ];
    }

    if (q?.trim()) {
      const expression = new RegExp(q.trim(), 'i');
      const search = {
        $or: [
          { name: expression },
          { ownerName: expression },
          { vehicleName: expression },
        ],
      };
      filter.$and = [...((filter.$and as unknown[]) || []), search];
    }

    return this.model
      .find(filter)
      .select(
        'name ownerName mobileNumber vehicleName variant vehicleType fuelType assignedTo status',
      )
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean()
      .exec();
  }
}
