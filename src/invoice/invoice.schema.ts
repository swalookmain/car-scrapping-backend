import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { SellerType } from 'src/common/enum/sellerType.enum';

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ required: true })
  sellerName: string;

  @Prop({ enum: SellerType, required: true })
  sellerType: SellerType;

  @Prop({
    required: true,
    default: () => `INV-${Date.now()}`,
  })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop()
  sellerGstin?: string;

  @Prop({ type: Number, required: true })
  purchaseAmount: number;

  @Prop({ type: Date, required: true })
  purchaseDate: Date;

  @Prop({ type: Boolean, default: true })
  gstApplicable: boolean;

  // if gst applicable, then gst rate is required
  @Prop({ type: Number })
  gstRate?: number;

  @Prop({ type: Number })
  gstAmount?: number;

  @Prop({ type: Boolean, required: true })
  reverseChargeApplicable: boolean;

  @Prop({
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export type InvoiceDocument = Invoice & Document;
export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
