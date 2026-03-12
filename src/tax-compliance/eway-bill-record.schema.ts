import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransportMode } from 'src/common/enum/transportMode.enum';

@Schema({ timestamps: true, collection: 'eway_bill_records' })
export class EwayBillRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SalesInvoice', required: true, unique: true })
  salesInvoiceId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  ewayBillNumber: string;

  @Prop({ type: Date, required: true })
  ewayGeneratedDate: Date;

  @Prop({ enum: TransportMode, required: true })
  transportMode: TransportMode;

  @Prop({ type: String, required: true, trim: true })
  vehicleNumber: string;

  @Prop({ type: String, required: true, trim: true })
  documentUrl: string;
}

export type EwayBillRecordDocument = EwayBillRecord & Document;
export const EwayBillRecordSchema = SchemaFactory.createForClass(EwayBillRecord);
