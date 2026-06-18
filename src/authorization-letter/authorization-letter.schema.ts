import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AuthorizationLetterStatus,
  AuthorizationLetterType,
} from 'src/common/enum/authorizationLetterStatus.enum';

@Schema({ _id: false })
export class AuthorizationLetterLotSnapshot {
  @Prop({ required: true, trim: true })
  lotNumber: string;

  @Prop({ trim: true })
  deliveryOrderNumber?: string;

  @Prop({ type: Date, required: true })
  lastLiftingDate: Date;

  @Prop({ type: Number, required: true })
  vehicleCount: number;

  @Prop({ required: true, trim: true })
  displayLabel: string;
}

@Schema({ timestamps: true })
export class AuthorizationLetter extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  letterNumber: string;

  @Prop({
    enum: AuthorizationLetterStatus,
    default: AuthorizationLetterStatus.DRAFT,
  })
  status: AuthorizationLetterStatus;

  @Prop({
    enum: AuthorizationLetterType,
    default: AuthorizationLetterType.EXTENSION_LIFTING,
  })
  letterType: AuthorizationLetterType;

  @Prop({ trim: true })
  buyerReferenceNumber?: string;

  @Prop({ required: true, trim: true })
  recipientName: string;

  @Prop({ required: true, trim: true })
  recipientAddress: string;

  @Prop({ trim: true })
  recipientPinCode?: string;

  @Prop({ type: Number, required: true, min: 1 })
  extensionDays: number;

  @Prop({ trim: true })
  auctionNumber?: string;

  @Prop({ type: [AuthorizationLetterLotSnapshot], default: [] })
  lotSnapshots: AuthorizationLetterLotSnapshot[];

  @Prop({ trim: true })
  generatedPdfUrl?: string;

  @Prop({ type: Date })
  generatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type AuthorizationLetterDocument = AuthorizationLetter & Document;
export const AuthorizationLetterSchema =
  SchemaFactory.createForClass(AuthorizationLetter);

AuthorizationLetterSchema.index({ organizationId: 1, auctionId: 1 }, { unique: true });
AuthorizationLetterSchema.index({ organizationId: 1, letterNumber: 1 }, { unique: true });
