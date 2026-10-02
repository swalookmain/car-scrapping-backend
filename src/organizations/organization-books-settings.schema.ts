import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'organization_books_settings' })
export class OrganizationBooksSettings {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true, unique: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Date })
  booksStartDate?: Date;
}

export const OrganizationBooksSettingsSchema = SchemaFactory.createForClass(
  OrganizationBooksSettings,
);
