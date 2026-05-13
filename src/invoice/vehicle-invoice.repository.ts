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

  findOneByRegistrationNumber(
    registrationNumber: string,
    organizationId?: string,
  ) {
    return this.model.findOne({
      registration_number: registrationNumber,
      isDeleted: { $ne: true },
      ...(organizationId
        ? { organizationId: new Types.ObjectId(organizationId) }
        : {}),
    });
  }

  deleteManyByInvoiceId(invoiceId: string) {
    return this.model.deleteMany({ invoiceId: new Types.ObjectId(invoiceId) });
  }

  softDeleteManyByInvoiceId(invoiceId: string, deletedBy: string) {
    return this.model.updateMany(
      {
        invoiceId: new Types.ObjectId(invoiceId),
        isDeleted: { $ne: true },
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(deletedBy),
      },
    );
  }
}
