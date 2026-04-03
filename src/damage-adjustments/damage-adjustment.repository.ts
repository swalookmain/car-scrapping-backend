import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PopulateOptions, SortOrder } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  DamageAdjustment,
  DamageAdjustmentDocument,
} from './damage-adjustment.schema';

@Injectable()
export class DamageAdjustmentRepository extends BaseRepository<DamageAdjustmentDocument> {
  private readonly partNamePopulate: PopulateOptions = {
    path: 'partId',
    select: 'partName',
  };

  constructor(
    @InjectModel(DamageAdjustment.name)
    private readonly damageAdjustmentModel: Model<DamageAdjustmentDocument>,
  ) {
    super(damageAdjustmentModel);
  }

  private mapPartName<T extends Record<string, unknown>>(record: T): T & {
    partId: string | null;
    partName: string | null;
  } {
    const part = record.partId as
      | { _id?: { toString(): string }; partName?: unknown }
      | undefined;

    return {
      ...record,
      partId: part?._id ? part._id.toString() : null,
      partName: typeof part?.partName === 'string' ? part.partName : null,
    };
  }

  async findPaginatedWithPartNames(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, SortOrder> = { createdAt: -1 },
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.damageAdjustmentModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(this.partNamePopulate)
        .lean()
        .exec(),
      this.damageAdjustmentModel.countDocuments(filter),
    ]);

    return {
      data: data.map((record) =>
        this.mapPartName(record as unknown as Record<string, unknown>),
      ),
      total,
    };
  }
}

