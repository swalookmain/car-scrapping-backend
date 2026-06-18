import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'lot_documents' })
export class LotDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  documentType: string;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ required: true, trim: true })
  storageKey: string;

  @Prop({ required: true, enum: ['cloudinary', 's3'] })
  provider: 'cloudinary' | 's3';

  @Prop({ trim: true })
  fileName?: string;

  @Prop({ trim: true })
  mimeType?: string;

  @Prop({ type: Number })
  size?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}

export type LotDocumentRecord = LotDocument & Document;
export const LotDocumentSchema = SchemaFactory.createForClass(LotDocument);

LotDocumentSchema.index({ lotId: 1, documentType: 1, createdAt: -1 });
