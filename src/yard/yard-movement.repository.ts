import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { YardMovement, YardMovementDocument } from './yard-movement.schema';

@Injectable()
export class YardMovementRepository extends BaseRepository<YardMovementDocument> {
  constructor(
    @InjectModel(YardMovement.name)
    yardMovementModel: Model<YardMovementDocument>,
  ) {
    super(yardMovementModel);
  }

  findByYardVehicleId(yardVehicleId: string) {
    return this.model
      .find({ yardVehicleId: new Types.ObjectId(yardVehicleId) })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name email')
      .populate('fromZoneId', 'name code')
      .populate('toZoneId', 'name code');
  }
}
