import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';
import { YardSourceType } from 'src/common/enum/yardSourceType.enum';
import { Invoice } from 'src/invoice/invoice.schema';

@Schema({ timestamps: true })
export class YardVehicle extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  /** Optional for auction-only intake before purchase invoice exists */
  @Prop({ type: Types.ObjectId, ref: 'VechileInvoice' })
  vehicleInvoiceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Invoice.name })
  invoiceId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  registrationNumber: string;

  @Prop({ type: String, trim: true })
  make?: string;

  @Prop({ type: String, trim: true })
  modelName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction' })
  auctionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot' })
  lotId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionVehicle' })
  auctionVehicleId?: Types.ObjectId;

  @Prop({ enum: YardSourceType, required: true })
  sourceType: YardSourceType;

  @Prop({ enum: YardVehicleStatus, required: true, default: YardVehicleStatus.AWAITING_ARRIVAL })
  currentStatus: YardVehicleStatus;

  @Prop({ type: Types.ObjectId, ref: 'YardZone' })
  currentZoneId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  currentSlot?: string;

  @Prop({ type: Date })
  gateInAt?: Date;

  @Prop({ type: Date })
  parkedAt?: Date;

  /** Whole-vehicle weight captured at park / vehicle detail (KGS) */
  @Prop({ type: Number, min: 0 })
  grossWeightKg?: number;

  @Prop({ type: Date })
  dismantlingStartedAt?: Date;

  @Prop({ type: Date })
  dismantledAt?: Date;

  @Prop({ type: Date })
  exitedAt?: Date;

  @Prop({ type: String, trim: true })
  remarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type YardVehicleDocument = YardVehicle & Document;
export const YardVehicleSchema = SchemaFactory.createForClass(YardVehicle);
YardVehicleSchema.index(
  { vehicleInvoiceId: 1 },
  { unique: true, sparse: true },
);
YardVehicleSchema.index(
  { organizationId: 1, auctionVehicleId: 1 },
  { unique: true, sparse: true },
);
YardVehicleSchema.index({ organizationId: 1, currentStatus: 1 });
YardVehicleSchema.index({ organizationId: 1, registrationNumber: 1 });
