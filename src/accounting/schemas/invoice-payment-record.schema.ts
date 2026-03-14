import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { PaymentMode } from 'src/common/enum/paymentMode.enum';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'invoice_payment_records' })
export class InvoicePaymentRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ enum: InvoiceType, required: true })
  invoiceType: InvoiceType;

  @Prop({ type: Types.ObjectId, required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  paymentAmount: number;

  @Prop({ type: Date, required: true })
  paymentDate: Date;

  @Prop({ enum: PaymentMode, required: true })
  paymentMode: PaymentMode;
}

export type InvoicePaymentRecordDocument = InvoicePaymentRecord & Document;
export const InvoicePaymentRecordSchema =
  SchemaFactory.createForClass(InvoicePaymentRecord);

InvoicePaymentRecordSchema.index(
  { organizationId: 1, invoiceType: 1, invoiceId: 1 },
  { name: 'idx_org_invoice' },
);
