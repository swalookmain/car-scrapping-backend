import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Invoice } from './invoice.schema';

@Schema()
export class Gemseller extends Invoice {}

export const GemsellerSchema =
  SchemaFactory.createForClass(Gemseller);
