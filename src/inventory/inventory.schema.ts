import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import { InventoryFormBucket } from 'src/common/enum/materialFormSection.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';
import { WeightUnit } from 'src/common/enum/weightUnit.enum';

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

  @Prop({ type: Types.ObjectId, ref: 'Auction' })
  auctionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot' })
  lotId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionVehicle' })
  auctionVehicleId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  partName: string;

  @Prop({ type: Types.ObjectId, ref: 'CatalogPart' })
  catalogPartId?: Types.ObjectId;

  @Prop({ trim: true })
  catalogPartCode?: string;

  @Prop({ type: String, required: true })
  vechileModel: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  partType: string;

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

  /** Mass for FORM-3 audit (always KG for aggregations) */
  @Prop({ type: Number, min: 0 })
  weightKg?: number;

  @Prop({ enum: WeightUnit, default: WeightUnit.KG })
  weightUnit?: WeightUnit;

  @Prop({ enum: StateOfMatter })
  stateOfMatter?: StateOfMatter;

  @Prop({ trim: true, uppercase: true })
  materialCode?: string;

  @Prop({ enum: MatterClass })
  matterClass?: MatterClass;

  @Prop({
    enum: InventoryFormBucket,
    default: InventoryFormBucket.UNMAPPED,
  })
  formBucket?: InventoryFormBucket;

  @Prop({ enum: Condition, required: true })
  condition: Condition;

  @Prop({ enum: Status, required: true })
  status: Status;

  @Prop({ type: String, trim: true })
  damageReason?: string;

  @Prop({ type: Date })
  damageRecordedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  damageRecordedBy?: Types.ObjectId;

  @Prop({ type: [InventoryAttachment], default: [] })
  documents?: InventoryAttachment[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
export type InventoryDocument = Inventory & Document;

InventorySchema.index({ vechileId: 1, createdAt: 1 });
InventorySchema.index({ materialCode: 1, formBucket: 1, createdAt: 1 });
InventorySchema.index({ invoiceId: 1 });
