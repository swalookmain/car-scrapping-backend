import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VechileInvoice,
  VechileInvoiceDocument,
} from './vechile-invoice.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class VehicleInvoiceRepository extends BaseRepository<VechileInvoiceDocument> {
  constructor(
    @InjectModel(VechileInvoice.name)
    vehicleInvoiceModel: Model<VechileInvoiceDocument>,
  ) {
    super(vehicleInvoiceModel);
  }

  findOneByRegistrationNumber(registrationNumber: string) {
    return this.model.findOne({
      registration_number: registrationNumber,
    });
  }

  deleteManyByInvoiceId(invoiceId: string) {
    return this.model.deleteMany({ invoiceId: new Types.ObjectId(invoiceId) });
  }
}
