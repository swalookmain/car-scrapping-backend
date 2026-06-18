import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuctionLotStatus } from 'src/common/enum/auctionLotStatus.enum';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';

@Schema({ _id: false, timestamps: false })
export class LotOfficer {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ trim: true })
  officerType?: string;
}

@Schema({ _id: false, timestamps: false })
export class LotDealSnapshot {
  @Prop({ type: Number })
  totalAmount?: number;

  @Prop({ type: Number })
  preEmdAmount?: number;

  @Prop({ type: Number })
  balanceAmount?: number;

  @Prop({ type: Date })
  dealClosedAt?: Date;

  @Prop({ type: Date })
  paymentDueDate?: Date;
}

@Schema({ _id: false, timestamps: false })
export class LotPaymentSnapshot {
  @Prop({ enum: LotPaymentStatus, default: LotPaymentStatus.NOT_PAID })
  paymentStatus: LotPaymentStatus;

  @Prop({ type: Number, default: 0 })
  amountPaidTotal: number;

  @Prop({ type: Number, default: 0 })
  amountLeft: number;
}

@Schema({ _id: false, timestamps: false })
export class LotAcceptanceLetter {
  @Prop({ type: Boolean, default: false })
  received: boolean;

  @Prop({ trim: true })
  letterNumber?: string;

  @Prop({ type: Date })
  receivedDate?: Date;
}

@Schema({ _id: false, timestamps: false })
export class LotDeliverySnapshot {
  @Prop({ trim: true })
  deliveryOrderNumber?: string;

  @Prop({ type: Date })
  lastLiftingDate?: Date;

  @Prop({ type: [LotOfficer], default: [] })
  officers: LotOfficer[];

  @Prop({ type: Boolean, default: false })
  finalApprovalForLifting: boolean;

  @Prop({ type: Boolean, default: false })
  liftingReminderActive: boolean;
}

@Schema({ _id: false, timestamps: false })
export class LotGatePassSnapshot {
  @Prop({ type: Date })
  gatePassDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'LotDocument' })
  documentId?: Types.ObjectId;
}

@Schema({ _id: false, timestamps: false })
export class LotRcmSnapshot {
  @Prop({ trim: true })
  challanNumber?: string;

  @Prop({ type: Date })
  transactionDate?: Date;

  @Prop({ type: Number })
  amount?: number;
}

@Schema({ timestamps: true })
export class AuctionLot extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  lotNumber: string;

  @Prop({ trim: true })
  lotName?: string;

  @Prop({ type: Number })
  preEmdAmount?: number;

  @Prop({ trim: true })
  lotDescription?: string;

  @Prop({ type: Number, required: true, min: 1 })
  vehicleCount: number;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: Number })
  expectedVehicleCount?: number;

  @Prop({ type: Number })
  reservePrice?: number;

  @Prop({ type: Number })
  bidAmount?: number;

  @Prop({ type: Number })
  awardedAmount?: number;

  @Prop({ trim: true })
  workOrderNumber?: string;

  @Prop({ trim: true })
  loaNumber?: string;

  @Prop({ type: Date })
  loaDate?: Date;

  @Prop({ type: Date })
  pickupWindowStart?: Date;

  @Prop({ type: Date })
  pickupWindowEnd?: Date;

  @Prop({ enum: AuctionLotStatus, default: AuctionLotStatus.NOT_BID })
  status: AuctionLotStatus;

  @Prop({ enum: LotOutcomeStatus, default: LotOutcomeStatus.PENDING })
  outcomeStatus: LotOutcomeStatus;

  @Prop({ type: LotDealSnapshot })
  deal?: LotDealSnapshot;

  @Prop({ type: LotPaymentSnapshot, default: () => ({ paymentStatus: LotPaymentStatus.NOT_PAID, amountPaidTotal: 0, amountLeft: 0 }) })
  payment?: LotPaymentSnapshot;

  @Prop({ type: LotAcceptanceLetter })
  acceptanceLetter?: LotAcceptanceLetter;

  @Prop({ type: LotDeliverySnapshot })
  delivery?: LotDeliverySnapshot;

  @Prop({ type: LotGatePassSnapshot })
  gatePass?: LotGatePassSnapshot;

  @Prop({ type: LotRcmSnapshot })
  rcm?: LotRcmSnapshot;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ type: [String], default: [] })
  invoiceNumbers: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export type AuctionLotDocument = AuctionLot & Document;
export const AuctionLotSchema = SchemaFactory.createForClass(AuctionLot);

AuctionLotSchema.index({ organizationId: 1, auctionId: 1, lotNumber: 1 }, { unique: true });
AuctionLotSchema.index({ organizationId: 1, auctionId: 1, outcomeStatus: 1 });
