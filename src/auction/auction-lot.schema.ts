import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuctionLotStatus } from 'src/common/enum/auctionLotStatus.enum';

@Schema({ timestamps: true })
export class AuctionLot extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  lotNumber: string;

  @Prop({ trim: true })
  lotName?: string;

  @Prop({ type: Number })
  preEmdAmount?: number;

  @Prop({ trim: true })
  lotDescription?: string;

  @Prop({ type: Number, required: true, min: 1 })
  vehicleCount: number;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: Number })
  expectedVehicleCount?: number;

  @Prop({ type: Number })
  reservePrice?: number;

  @Prop({ type: Number })
  bidAmount?: number;

  @Prop({ type: Number })
  awardedAmount?: number;

  @Prop({ trim: true })
  workOrderNumber?: string;

  @Prop({ trim: true })
  loaNumber?: string;

  @Prop({ type: Date })
  loaDate?: Date;

  @Prop({ type: Date })
  pickupWindowStart?: Date;

  @Prop({ type: Date })
  pickupWindowEnd?: Date;

  @Prop({ enum: AuctionLotStatus, default: AuctionLotStatus.NOT_BID })
  status: AuctionLotStatus;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ type: [String], default: [] })
  invoiceNumbers: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export type AuctionLotDocument = AuctionLot & Document;
export const AuctionLotSchema = SchemaFactory.createForClass(AuctionLot);

AuctionLotSchema.index({ organizationId: 1, auctionId: 1, lotNumber: 1 }, { unique: true });
