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

  @Prop({ type: Date })
  lastLiftingDate?: Date;

  @Prop({ type: Number, required: true })
  vehicleCount: number;

  @Prop({ required: true, trim: true })
  displayLabel: string;

  @Prop({ trim: true })
  auctionDetails?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  datesOfLifting?: string;

  @Prop({ trim: true })
  liftingDistrict?: string;

  @Prop({ trim: true })
  liftingState?: string;

  @Prop({ trim: true })
  elvDetails?: string;
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
    default: AuthorizationLetterType.AUTHORIZATION_DELIVERY,
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

  /** Authorized representative who will take delivery */
  @Prop({ required: true, trim: true })
  authorizedPersonName: string;

  /** Aadhaar / other ID proof number */
  @Prop({ required: true, trim: true })
  authorizedPersonIdProof: string;

  @Prop({ type: Date })
  letterDate?: Date;

  /** Legacy field — unused by delivery-authorization template */
  @Prop({ type: Number, min: 1, default: 1 })
  extensionDays?: number;

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
