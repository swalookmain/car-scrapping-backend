import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class YardMovement extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'YardVehicle', required: true })
  yardVehicleId: Types.ObjectId;

  @Prop({ enum: YardVehicleStatus })
  fromStatus?: YardVehicleStatus;

  @Prop({ enum: YardVehicleStatus, required: true })
  toStatus: YardVehicleStatus;

  @Prop({ type: Types.ObjectId, ref: 'YardZone' })
  fromZoneId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'YardZone' })
  toZoneId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  fromSlot?: string;

  @Prop({ type: String, trim: true })
  toSlot?: string;

  @Prop({ type: String, trim: true })
  reason?: string;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: String, trim: true })
  source?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;
}

export type YardMovementDocument = YardMovement & Document;
export const YardMovementSchema = SchemaFactory.createForClass(YardMovement);
YardMovementSchema.index({ yardVehicleId: 1, createdAt: -1 });
