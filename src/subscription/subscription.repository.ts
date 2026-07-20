import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Subscription } from './subscription.schema';
import { validateObjectId } from 'src/common/utils/security.util';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
  ) {
    super(subscriptionModel);
  }

  /** Match organizationId stored as BSON ObjectId (string queries do not match). */
  private organizationFilter(organizationId: string) {
    const validatedOrgId = validateObjectId(organizationId, 'Organization ID');
    return { organizationId: new Types.ObjectId(validatedOrgId) };
  }

  async findActiveByOrganizationId(organizationId: string) {
    return this.subscriptionModel
      .findOne({ ...this.organizationFilter(organizationId), status: 'ACTIVE' })
      .sort({ createdAt: -1 });
  }

  async findLatestByOrganizationId(organizationId: string) {
    return this.subscriptionModel
      .findOne(this.organizationFilter(organizationId))
      .sort({ createdAt: -1 });
  }

  /** Latest subscription per org (by createdAt). Returns lean docs. */
  async findLatestByOrganizationIds(organizationIds: string[]) {
    const objectIds = organizationIds
      .filter(Boolean)
      .map((id) => new Types.ObjectId(validateObjectId(id, 'Organization ID')));
    if (!objectIds.length) return [];

    return this.subscriptionModel.aggregate([
      { $match: { organizationId: { $in: objectIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$organizationId',
          type: { $first: '$type' },
          plan: { $first: '$plan' },
          endDate: { $first: '$endDate' },
          status: { $first: '$status' },
          startDate: { $first: '$startDate' },
        },
      },
    ]);
  }

  async findExpiredActive(beforeDate: Date) {
    return this.subscriptionModel.find({
      status: 'ACTIVE',
      endDate: { $lt: beforeDate },
    });
  }
}
