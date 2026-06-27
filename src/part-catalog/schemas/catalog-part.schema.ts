import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CatalogPartCategory } from 'src/common/enum/catalogPartCategory.enum';

@Schema({ timestamps: true })
export class CatalogPart extends Document {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  partType: string;

  @Prop({ enum: CatalogPartCategory, default: CatalogPartCategory.SALEABLE })
  category: CatalogPartCategory;

  @Prop({ type: Number, default: 1, min: 0 })
  defaultQty: number;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isActive: boolean;
}

export type CatalogPartDocument = CatalogPart & Document;
export const CatalogPartSchema = SchemaFactory.createForClass(CatalogPart);
