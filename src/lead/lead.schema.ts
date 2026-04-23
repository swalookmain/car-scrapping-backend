import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';
import { FuelType } from 'src/common/enum/fuelType.enum';
import { VehicleType } from 'src/common/enum/vehicleType.enum';
import { LeadSource } from 'src/common/enum/leadSource.enum';

@Schema({ timestamps: true })
export class Lead extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  mobileNumber: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ trim: true })
  ownerName?: string;

  @Prop({ trim: true })
  vehicleName?: string;

  @Prop({ enum: VehicleType })
  vehicleType?: VehicleType;

  @Prop({ trim: true })
  variant?: string;

  @Prop({ enum: FuelType })
  fuelType?: FuelType;

  @Prop({ trim: true })
  registrationNumber?: string;

  @Prop({ trim: true })
  vehicleWorkingCondition?: string;

  @Prop({ trim: true })
  last5ChassisNumber?: string;

  @Prop({ trim: true })
  engineNumber?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop({ type: Number })
  yearOfManufacture?: number;

  @Prop({ trim: true })
  rtoDistrictBranch?: string;

  @Prop({ type: Boolean, default: true })
  isOwnerSelf: boolean;

  @Prop({ type: Boolean, default: true })
  isInterested: boolean;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  aadhaarNumber?: string;

  @Prop({ trim: true })
  aadhaarLinkedMobileNumber?: string;

  @Prop({ trim: true })
  panNumber?: string;

  @Prop({ trim: true })
  bankAccountNumber?: string;

  @Prop({ trim: true })
  bankIfscCode?: string;

  @Prop({ trim: true })
  bankBranchName?: string;

  @Prop({ trim: true })
  bankName?: string;

  @Prop({ enum: LeadSource })
  leadSource?: LeadSource;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ trim: true })
  placeOfSupplyState?: string;

  @Prop({ type: Number })
  purchaseAmount?: number;

  @Prop({ type: Date })
  purchaseDate?: Date;

  @Prop({ type: Boolean, default: false })
  reverseChargeApplicable?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ enum: LeadStatus, default: LeadStatus.OPEN })
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'Invoice' })
  invoiceId?: Types.ObjectId;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  closedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export type LeadDocument = Lead & Document;
export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index({ organizationId: 1, status: 1, assignedTo: 1, createdAt: -1 });
LeadSchema.index({ organizationId: 1, invoiceId: 1 }, { sparse: true });
