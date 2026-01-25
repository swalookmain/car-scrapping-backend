import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Invoice } from './invoice.schema';
import { VechileInvoice } from './vechile-invoice.schema';

export type StorageProvider = 'cloudinary' | 's3';
export type PurchaseDocumentType = 'rc' | 'ownerId' | 'other';

@Schema({ timestamps: true })
export class PurchaseDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: Invoice.name, required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: VechileInvoice.name })
  vechileInvoiceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  storageKey: string;

  @Prop({ required: true, enum: ['cloudinary', 's3'] })
  provider: StorageProvider;

  @Prop({ required: true, enum: ['rc', 'ownerId', 'other'] })
  documentType: PurchaseDocumentType;
}

export type PurchaseDocumentDocument = PurchaseDocument & Document;
export const PurchaseDocumentSchema =
  SchemaFactory.createForClass(PurchaseDocument);
