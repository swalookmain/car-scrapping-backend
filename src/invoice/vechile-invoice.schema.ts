import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VechicleStatus } from 'src/common/enum/vechicleStatus.enum';

@Schema({ timestamps: true })
export class VechileInvoice extends Document {
  @Prop({ type: Types.ObjectId, ref: 'invoices', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  ownerName: string;

  @Prop({ type: String, required: true })
  vechileName: string;

  @Prop({ type: String, required: true })
  vechileNumber: string;

  @Prop({ type: String, required: true })
  registrationNumber: string;

  @Prop({ type: String, required: true })
  rcNumber: string;

  @Prop({
    enum: VechicleStatus,
    required: true,
    default: VechicleStatus.PURCHASED,
  })
  vechicleStatus: VechicleStatus;
}
export type VechileInvoiceDocument = VechileInvoice & Document;
export const VechileInvoiceSchema = SchemaFactory.createForClass(VechileInvoice);