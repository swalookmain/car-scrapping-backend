import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';

@Schema({ timestamps: true, collection: 'sales_invoices' })
export class SalesInvoice extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Buyer', required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  invoiceDate: Date;

  @Prop({ type: String, required: true, trim: true })
  placeOfSupplyState: string;

  @Prop({ type: Boolean, default: true, required: true })
  gstApplicable: boolean;

  @Prop({ type: Number })
  gstRate?: number;

  @Prop({ type: Number, default: 0 })
  gstAmount?: number;

  @Prop({ type: Number, required: true, min: 0 })
  taxableAmount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cgstAmount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sgstAmount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  igstAmount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalTaxAmount: number;

  @Prop({ type: Boolean, required: true, default: false })
  isInterstate: boolean;

  @Prop({ type: Boolean, default: false, required: true })
  reverseChargeApplicable: boolean;

  @Prop({ type: Number, required: true })
  subtotalAmount: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, trim: true })
  ewayBillNumber?: string;

  @Prop({ type: String, trim: true })
  ewayBillDocumentUrl?: string;

  @Prop({
    enum: SalesInvoiceStatus,
    default: SalesInvoiceStatus.DRAFT,
    required: true,
  })
  status: SalesInvoiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export type SalesInvoiceDocument = SalesInvoice & Document;
export const SalesInvoiceSchema = SchemaFactory.createForClass(SalesInvoice);

SalesInvoiceSchema.index(
  { organizationId: 1, invoiceNumber: 1 },
  { unique: true, name: 'uniq_sales_invoice_number_org' },
);
