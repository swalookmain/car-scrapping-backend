import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';
import { WeightUnit } from 'src/common/enum/weightUnit.enum';

@Schema({ timestamps: true, collection: 'catalog_part_org_defaults' })
export class CatalogPartOrgDefaults extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CatalogPart', required: true })
  catalogPartId: Types.ObjectId;

  @Prop({ enum: StateOfMatter })
  stateOfMatter?: StateOfMatter;

  @Prop({ trim: true, uppercase: true })
  materialCode?: string;

  @Prop({ enum: MatterClass })
  matterClass?: MatterClass;

  @Prop({ enum: WeightUnit })
  weightUnit?: WeightUnit;
}

export type CatalogPartOrgDefaultsDocument = CatalogPartOrgDefaults & Document;
export const CatalogPartOrgDefaultsSchema = SchemaFactory.createForClass(
  CatalogPartOrgDefaults,
);

CatalogPartOrgDefaultsSchema.index(
  { organizationId: 1, catalogPartId: 1 },
  { unique: true },
);
