import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class OrganizationLetterSettings {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true, unique: true })
  organizationId: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  legalName: string;

  @Prop({ trim: true, default: '' })
  tagline: string;

  @Prop({ trim: true, default: '' })
  gstin: string;

  @Prop({ trim: true, default: '' })
  proprietorName: string;

  @Prop({ trim: true, default: 'Proprietor' })
  proprietorTitle: string;

  @Prop({ trim: true, default: '' })
  signatoryAddress: string;

  @Prop({ trim: true, default: '' })
  address: string;

  @Prop({ trim: true, default: '' })
  pinCode: string;

  @Prop({ type: [String], default: [] })
  mobileNumbers: string[];

  @Prop({ trim: true, default: '' })
  email: string;

  @Prop({ trim: true, default: '' })
  website: string;

  @Prop({ trim: true, default: '' })
  logoUrl: string;

  @Prop({ trim: true, default: '' })
  rvsfLogoUrl: string;

  @Prop({ trim: true, default: '' })
  signatureUrl: string;

  @Prop({ trim: true, default: 'MSTC BUYER REF. NO.' })
  buyerRefLabel: string;
}

export const OrganizationLetterSettingsSchema = SchemaFactory.createForClass(
  OrganizationLetterSettings,
);
