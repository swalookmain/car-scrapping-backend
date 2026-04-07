import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Lead } from './lead.schema';

export type LeadDocumentType = 'aadhaar' | 'rc' | 'pan' | 'bankDetail';
export type LeadDocumentPageMode = 'single' | 'double';
export type LeadDocumentPageSide = 'single' | 'front' | 'back';
export type LeadStorageProvider = 'cloudinary' | 's3';

@Schema({ timestamps: true })
export class LeadDocumentRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: Lead.name, required: true })
  leadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true, enum: ['aadhaar', 'rc', 'pan', 'bankDetail'] })
  documentType: LeadDocumentType;

  @Prop({ required: true, enum: ['single', 'double'] })
  pageMode: LeadDocumentPageMode;

  @Prop({ required: true, enum: ['single', 'front', 'back'] })
  pageSide: LeadDocumentPageSide;

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
  provider: LeadStorageProvider;
}

export type LeadDocumentRecordDocument = LeadDocumentRecord & Document;
export const LeadDocumentRecordSchema =
  SchemaFactory.createForClass(LeadDocumentRecord);

LeadDocumentRecordSchema.index(
  { leadId: 1, documentType: 1, pageSide: 1 },
  { unique: true },
);
