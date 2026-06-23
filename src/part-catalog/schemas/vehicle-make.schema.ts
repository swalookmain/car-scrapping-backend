import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class VehicleMake extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;
}

export type VehicleMakeDocument = VehicleMake & Document;
export const VehicleMakeSchema = SchemaFactory.createForClass(VehicleMake);
