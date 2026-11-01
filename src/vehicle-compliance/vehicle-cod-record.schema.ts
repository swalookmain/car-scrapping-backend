import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';
import { Invoice } from 'src/invoice/invoice.schema';
import { VechileInvoice } from 'src/invoice/vechile-invoice.schema';

@Schema({ timestamps: true, collection: 'vehicle_cod_records' })
export class VehicleCodRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  /**
   * Canonical vehicle identity (same YardVehicle id used by inventory/sales).
   */
  @Prop({ type: Types.ObjectId, ref: 'YardVehicle', required: true })
  yardVehicleId: Types.ObjectId;

  /** Optional legacy purchase vehicle-invoice link (not vehicle identity) */
  @Prop({ type: Types.ObjectId, ref: VechileInvoice.name })
  vehicleId?: Types.ObjectId;

  /** Optional purchase invoice link (not vehicle identity) */
  @Prop({ type: Types.ObjectId, ref: Invoice.name })
  invoiceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction' })
  auctionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot' })
  lotId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionVehicle' })
  auctionVehicleId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  registrationNumber?: string;

  @Prop({ type: Boolean, default: false, required: true })
  codGenerated: boolean;

  @Prop({ type: Date })
  codGeneratedAt?: Date;

  @Prop({ type: String })
  codDocumentUrl?: string;

  @Prop({ type: String })
  codInwardNumber?: string;

  @Prop({ type: Date })
  codIssueDate?: Date;

  @Prop({ type: Boolean, default: false, required: true })
  cvsGenerated: boolean;

  @Prop({ type: Date })
  cvsGeneratedAt?: Date;

  @Prop({ type: String })
  cvsDocumentUrl?: string;

  @Prop({ type: String })
  rtoOffice?: string;

  @Prop({ enum: RtoStatus, default: RtoStatus.NOT_APPLIED, required: true })
  rtoStatus: RtoStatus;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export type VehicleCodRecordDocument = VehicleCodRecord & Document;
export const VehicleCodRecordSchema =
  SchemaFactory.createForClass(VehicleCodRecord);

VehicleCodRecordSchema.index(
  { vehicleId: 1 },
  {
    unique: true,
    name: 'vehicleId_partial_unique',
    partialFilterExpression: {
      vehicleId: { $exists: true, $type: 'objectId' },
    },
  },
);
VehicleCodRecordSchema.index(
  { yardVehicleId: 1 },
  {
    unique: true,
    name: 'yardVehicleId_partial_unique',
    partialFilterExpression: {
      yardVehicleId: { $exists: true, $type: 'objectId' },
    },
  },
);
VehicleCodRecordSchema.index({ organizationId: 1, createdAt: -1 });
VehicleCodRecordSchema.index({ leadId: 1 });
VehicleCodRecordSchema.index({ auctionId: 1 });
