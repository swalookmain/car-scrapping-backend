import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleType } from 'src/common/enum/vehicleType.enum';

@Schema({ timestamps: false })
export class VehicleTypeTemplatePart extends Document {
  @Prop({ enum: VehicleType, required: true })
  vehicleType: VehicleType;

  @Prop({ type: Types.ObjectId, ref: 'CatalogPart', required: true })
  catalogPartId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 0 })
  defaultQty: number;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export type VehicleTypeTemplatePartDocument = VehicleTypeTemplatePart & Document;
export const VehicleTypeTemplatePartSchema = SchemaFactory.createForClass(
  VehicleTypeTemplatePart,
);

VehicleTypeTemplatePartSchema.index(
  { vehicleType: 1, catalogPartId: 1 },
  { unique: true },
);
