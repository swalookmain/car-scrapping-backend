import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Invoice } from './invoice.schema';

@Schema()
export class MSTCSeller extends Invoice {
  @Prop({ required: true })
  auctionNumber: string;

  @Prop({ required: true })
  auctionDate: Date;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  lotNumber: string;
}

export const MSTCSellerSchema =
  SchemaFactory.createForClass(MSTCSeller);
