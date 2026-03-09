import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'sales_invoice_items',
})
export class SalesInvoiceItem extends Document {
  @Prop({ type: Types.ObjectId, ref: 'SalesInvoice', required: true })
  salesInvoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Inventory', required: true })
  partId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  itemCode: string;

  @Prop({ type: String, required: true, trim: true })
  vehicleCode: string;

  @Prop({ type: String, required: true, trim: true })
  purchaseInvoiceNumber: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal: number;
}

export type SalesInvoiceItemDocument = SalesInvoiceItem & Document;
export const SalesInvoiceItemSchema =
  SchemaFactory.createForClass(SalesInvoiceItem);

SalesInvoiceItemSchema.index({ salesInvoiceId: 1, partId: 1 });
