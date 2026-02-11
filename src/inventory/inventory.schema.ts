import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Condition } from 'src/common/enum/condition.enum';
import { PartType } from 'src/common/enum/partType.enum';
import { Status } from 'src/common/enum/status.enum';

@Schema({ _id: false, timestamps: false })
export class InventoryAttachment {
  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  storageKey: string;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  uploadedAt: Date;
}

@Schema({ timestamps: true })
export class Inventory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: String, required: true })
  purchaseInvoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'VechileInvoice', required: true })
  vechileId: Types.ObjectId;

  @Prop({ type: String, required: true })
  partName: string;

  @Prop({ type: String, required: true })
  vechileModel: string;

  @Prop({ enum: PartType, required: true })
  partType: PartType;

  @Prop({ type: Number, required: true })
  openingStock: number;

  @Prop({ type: Number, required: true })
  availableQuantity: number;

  @Prop({ type: Number, required: true })
  quantityReceived: number;

  @Prop({ type: Number, required: true })
  quantityIssued: number;

  @Prop({ type: Number })
  unitPrice?: number;

  @Prop({ enum: Condition, required: true })
  condition: Condition;

  @Prop({ enum: Status, required: true })
  status: Status;

  @Prop({ type: [InventoryAttachment], default: [] })
  documents?: InventoryAttachment[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
export type InventoryDocument = Inventory & Document;
