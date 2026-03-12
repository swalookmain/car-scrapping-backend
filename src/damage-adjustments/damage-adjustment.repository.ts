import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  DamageAdjustment,
  DamageAdjustmentDocument,
} from './damage-adjustment.schema';

@Injectable()
export class DamageAdjustmentRepository extends BaseRepository<DamageAdjustmentDocument> {
  constructor(
    @InjectModel(DamageAdjustment.name)
    private readonly damageAdjustmentModel: Model<DamageAdjustmentDocument>,
  ) {
    super(damageAdjustmentModel);
  }
}

