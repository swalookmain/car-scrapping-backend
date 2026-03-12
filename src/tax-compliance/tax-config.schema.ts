import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'tax_config' })
export class TaxConfig extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true, unique: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  defaultGstRate: number;

  @Prop({ type: String, required: true, trim: true })
  stateCode: string;

  @Prop({ type: Boolean, default: true, required: true })
  gstEnabled: boolean;
}

export type TaxConfigDocument = TaxConfig & Document;
export const TaxConfigSchema = SchemaFactory.createForClass(TaxConfig);
