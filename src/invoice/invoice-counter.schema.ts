import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InvoiceCounter extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  financialYear: string;

  @Prop({ type: Number, required: true, default: 0 })
  sequence: number;
}

export type InvoiceCounterDocument = InvoiceCounter & Document;
export const InvoiceCounterSchema = SchemaFactory.createForClass(InvoiceCounter);

InvoiceCounterSchema.index(
  { organizationId: 1, financialYear: 1 },
  { unique: true },
);
