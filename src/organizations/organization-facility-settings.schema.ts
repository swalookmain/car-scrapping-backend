import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class AuthorisedCapacity {
  @Prop({ type: Number, default: 0, min: 0 })
  L: number;

  @Prop({ type: Number, default: 0, min: 0 })
  M: number;

  @Prop({ type: Number, default: 0, min: 0 })
  N: number;

  @Prop({ type: Number, default: 0, min: 0 })
  OTHER: number;
}

export const AuthorisedCapacitySchema =
  SchemaFactory.createForClass(AuthorisedCapacity);

@Schema({ timestamps: true, collection: 'organization_facility_settings' })
export class OrganizationFacilitySettings {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true, unique: true })
  organizationId: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  name: string;

  @Prop({ trim: true, default: '' })
  registrationNumber: string;

  @Prop({ trim: true, default: '' })
  validity: string;

  @Prop({ type: AuthorisedCapacitySchema, default: () => ({}) })
  authorisedCapacity: AuthorisedCapacity;
}

export const OrganizationFacilitySettingsSchema = SchemaFactory.createForClass(
  OrganizationFacilitySettings,
);
