import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: false })
export class AuthorizationLetterCounter extends Document {
  @Prop({ required: true })
  year: number;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const AuthorizationLetterCounterSchema = SchemaFactory.createForClass(
  AuthorizationLetterCounter,
);

AuthorizationLetterCounterSchema.index({ year: 1 }, { unique: true });
