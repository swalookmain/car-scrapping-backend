import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Invoice } from './invoice.schema';
import { LeadSource } from 'src/common/enum/leadSource.enum';

@Schema()
export class DirectSeller extends Invoice {
  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  aadhaarNumber: string;

  @Prop({ required: true })
  panNumber: string;

  @Prop({ enum: LeadSource, required: true })
  leadSource: LeadSource;
}

export const DirectSellerSchema =
  SchemaFactory.createForClass(DirectSeller);