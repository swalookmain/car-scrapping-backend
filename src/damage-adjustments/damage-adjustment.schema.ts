import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Condition } from 'src/common/enum/condition.enum';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'damage_adjustments',
})
export class DamageAdjustment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Inventory', required: true })
  partId: Types.ObjectId;

  @Prop({ enum: Condition, required: true })
  previousCondition: Condition;

  @Prop({ enum: Condition, required: true })
  newCondition: Condition;

  @Prop({ type: Number, required: true, min: 1 })
  quantityAffected: number;

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export type DamageAdjustmentDocument = DamageAdjustment & Document;
export const DamageAdjustmentSchema =
  SchemaFactory.createForClass(DamageAdjustment);

