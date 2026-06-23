import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleType } from 'src/common/enum/vehicleType.enum';

@Schema({ timestamps: true })
export class VehicleModel extends Document {
  @Prop({ type: Types.ObjectId, ref: 'VehicleMake', required: true })
  makeId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ enum: VehicleType, default: VehicleType.COMMERCIAL })
  vehicleType: VehicleType;

  @Prop({ default: true })
  isActive: boolean;
}

export type VehicleModelDocument = VehicleModel & Document;
export const VehicleModelSchema = SchemaFactory.createForClass(VehicleModel);

VehicleModelSchema.index({ makeId: 1, slug: 1 }, { unique: true });
