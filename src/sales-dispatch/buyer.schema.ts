import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BuyerType } from 'src/common/enum/buyerType.enum';

@Schema({ timestamps: true, collection: 'buyers' })
export class Buyer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  buyerName: string;

  @Prop({ enum: BuyerType, required: true })
  buyerType: BuyerType;

  @Prop({ type: String, trim: true })
  gstin?: string;

  @Prop({ type: String, required: true, trim: true })
  mobile: string;

  @Prop({ type: String, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: String, required: true, trim: true })
  address: string;
}

export type BuyerDocument = Buyer & Document;
export const BuyerSchema = SchemaFactory.createForClass(Buyer);
