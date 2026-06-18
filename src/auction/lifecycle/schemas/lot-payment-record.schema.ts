import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'lot_payment_records' })
export class LotPaymentRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amountPaid: number;

  @Prop({ trim: true })
  transactionNumber?: string;

  @Prop({ trim: true })
  bank?: string;

  @Prop({ type: Date })
  transferDate?: Date;

  @Prop({ trim: true })
  remark?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export type LotPaymentRecordDocument = LotPaymentRecord & Document;
export const LotPaymentRecordSchema = SchemaFactory.createForClass(LotPaymentRecord);

LotPaymentRecordSchema.index({ lotId: 1, createdAt: -1 });
LotPaymentRecordSchema.index({ organizationId: 1, auctionId: 1, lotId: 1 });
