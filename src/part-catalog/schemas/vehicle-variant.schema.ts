import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FuelType } from 'src/common/enum/fuelType.enum';

@Schema({ timestamps: true })
export class VehicleVariant extends Document {
  @Prop({ type: Types.ObjectId, ref: 'VehicleModel', required: true })
  modelId: Types.ObjectId;

  @Prop({ trim: true, default: 'Standard' })
  name: string;

  @Prop({ trim: true, lowercase: true, default: 'standard' })
  slug: string;

  @Prop({ enum: FuelType })
  fuelType?: FuelType;

  @Prop({ default: true })
  isActive: boolean;
}

export type VehicleVariantDocument = VehicleVariant & Document;
export const VehicleVariantSchema = SchemaFactory.createForClass(VehicleVariant);

VehicleVariantSchema.index({ modelId: 1, slug: 1 }, { unique: true });
