import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuctionStatus } from 'src/common/enum/auctionStatus.enum';

@Schema({ _id: false, timestamps: false })
export class AuctionOfficer {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  phoneNumber?: string;
}

@Schema({ timestamps: true })
export class Auction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true, default: 'MSTC' })
  sourcePlatform: string;

  @Prop({ required: true, trim: true })
  auctionNumber: string;

  @Prop({ type: Date, required: true })
  auctionDate: Date;

  @Prop({ type: Date, required: true })
  startDateTime: Date;

  @Prop({ type: Date, required: true })
  endDateTime: Date;

  @Prop({ type: Date })
  bidSubmissionDeadline?: Date;

  @Prop({ enum: AuctionStatus, default: AuctionStatus.UPCOMING })
  status: AuctionStatus;

  @Prop({ type: Date })
  dealClosedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop({ trim: true })
  sellerEntityName?: string;

  @Prop({ trim: true })
  sellerEntityCode?: string;

  @Prop({ trim: true })
  auctionLocation?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ type: Number, default: 0 })
  emdAmount?: number;

  @Prop({ trim: true })
  emdReference?: string;

  @Prop({ type: Date })
  emdPaidOn?: Date;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ type: [AuctionOfficer], default: [] })
  officers: AuctionOfficer[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export type AuctionDocument = Auction & Document;
export const AuctionSchema = SchemaFactory.createForClass(Auction);
AuctionSchema.index({ organizationId: 1, auctionNumber: 1 }, { unique: true });
