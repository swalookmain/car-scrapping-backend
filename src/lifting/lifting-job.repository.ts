import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { LiftingJob, LiftingJobDocument } from './lifting-job.schema';

@Injectable()
export class LiftingJobRepository extends BaseRepository<LiftingJobDocument> {
  constructor(
    @InjectModel(LiftingJob.name)
    model: Model<LiftingJobDocument>,
  ) {
    super(model);
  }

  findByLeadId(organizationId: string, leadId: string) {
    return this.model.findOne({
      organizationId: new Types.ObjectId(organizationId),
      leadId: new Types.ObjectId(leadId),
    });
  }

  findByYardVehicleId(yardVehicleId: string) {
    return this.model.findOne({
      yardVehicleId: new Types.ObjectId(yardVehicleId),
    });
  }

  countByFilter(filter: Record<string, unknown>) {
    return this.model.countDocuments(filter);
  }

  async findYardVehicleIdsByAssignee(organizationId: string, userId: string) {
    const rows = await this.model
      .find({
        organizationId: new Types.ObjectId(organizationId),
        assignedTo: new Types.ObjectId(userId),
        yardVehicleId: { $exists: true, $ne: null },
      })
      .select('yardVehicleId')
      .lean()
      .exec();
    return rows
      .map((row) => row.yardVehicleId)
      .filter((id): id is Types.ObjectId => Boolean(id));
  }
}
