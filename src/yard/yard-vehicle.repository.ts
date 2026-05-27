import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { YardVehicle, YardVehicleDocument } from './yard-vehicle.schema';

@Injectable()
export class YardVehicleRepository extends BaseRepository<YardVehicleDocument> {
  constructor(
    @InjectModel(YardVehicle.name)
    yardVehicleModel: Model<YardVehicleDocument>,
  ) {
    super(yardVehicleModel);
  }

  findByVehicleInvoiceId(vehicleInvoiceId: string) {
    return this.model.findOne({
      vehicleInvoiceId: new Types.ObjectId(vehicleInvoiceId),
    });
  }

  countByStatus(organizationId: string, status: string) {
    return this.model.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      currentStatus: status,
    });
  }
}
