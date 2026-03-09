import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InventoryMovementType } from 'src/common/enum/inventoryMovementType.enum';
import { InventoryReferenceType } from 'src/common/enum/inventoryReferenceType.enum';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class InventoryMovement extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Inventory', required: true })
  partId: Types.ObjectId;

  @Prop({ enum: InventoryMovementType, required: true })
  movementType: InventoryMovementType;

  @Prop({ enum: InventoryReferenceType, required: true })
  referenceType: InventoryReferenceType;

  @Prop({ type: Types.ObjectId, ref: 'SalesInvoice', required: true })
  referenceId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export type InventoryMovementDocument = InventoryMovement & Document;
export const InventoryMovementSchema =
  SchemaFactory.createForClass(InventoryMovement);

InventoryMovementSchema.index({ referenceType: 1, referenceId: 1, partId: 1 });
