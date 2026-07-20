import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MaterialFormSection } from 'src/common/enum/materialFormSection.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';

@Schema({ timestamps: true, collection: 'material_master' })
export class MaterialMaster extends Document {
  @Prop({ required: true, trim: true, uppercase: true })
  code: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ enum: MaterialFormSection, required: true })
  formSection: MaterialFormSection;

  @Prop({ enum: MatterClass, required: true, default: MatterClass.OTHER })
  matterClass: MatterClass;

  @Prop({ enum: StateOfMatter })
  defaultStateOfMatter?: StateOfMatter;

  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ default: true })
  isActive: boolean;

  /** null = global system material */
  @Prop({ type: Types.ObjectId, ref: 'organizations', default: null })
  organizationId?: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export type MaterialMasterDocument = MaterialMaster & Document;
export const MaterialMasterSchema = SchemaFactory.createForClass(MaterialMaster);

MaterialMasterSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true },
);
MaterialMasterSchema.index({ isActive: 1, formSection: 1, sortOrder: 1 });
