import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuctionVehicleStatus } from 'src/common/enum/auctionVehicleStatus.enum';

@Schema({ timestamps: true })
export class AuctionVehicle extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ trim: true })
  vehicleType?: string;

  @Prop({ trim: true })
  make?: string;

  @Prop({ trim: true })
  vehicleModel?: string;

  @Prop({ trim: true })
  variant?: string;

  @Prop({ trim: true })
  vehicleNumber?: string;

  @Prop({ trim: true })
  registrationNumber?: string;

  @Prop({ trim: true })
  chassisLast5?: string;

  @Prop({ type: Number })
  yearOfManufacture?: number;

  @Prop({ trim: true })
  color?: string;

  @Prop({ trim: true })
  vehicleCondition?: string;

  @Prop({ type: Boolean, default: false })
  rcAvailable: boolean;

  @Prop({ type: Boolean, default: false })
  keyAvailable: boolean;

  @Prop({ type: Date })
  pickupDate?: Date;

  @Prop({ enum: AuctionVehicleStatus, default: AuctionVehicleStatus.IDENTIFIED })
  status: AuctionVehicleStatus;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ type: String })
  invoiceNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export type AuctionVehicleDocument = AuctionVehicle & Document;
export const AuctionVehicleSchema = SchemaFactory.createForClass(AuctionVehicle);

AuctionVehicleSchema.index({ organizationId: 1, auctionId: 1, lotId: 1 });
