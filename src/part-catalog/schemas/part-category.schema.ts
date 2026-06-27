import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PartCategory extends Document {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isSystem: boolean;
}

export type PartCategoryDocument = PartCategory & Document;
export const PartCategorySchema = SchemaFactory.createForClass(PartCategory);
