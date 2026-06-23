import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CatalogPartSource } from 'src/common/enum/catalogPartCategory.enum';

@Schema({ timestamps: true })
export class VariantPartMap extends Document {
  @Prop({ type: Types.ObjectId, ref: 'VehicleVariant', required: true })
  variantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CatalogPart', required: true })
  catalogPartId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 0 })
  defaultQty: number;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ enum: CatalogPartSource, default: CatalogPartSource.SEED })
  source: CatalogPartSource;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  addedBy?: Types.ObjectId;
}

export type VariantPartMapDocument = VariantPartMap & Document;
export const VariantPartMapSchema = SchemaFactory.createForClass(VariantPartMap);

VariantPartMapSchema.index({ variantId: 1, catalogPartId: 1 }, { unique: true });
