import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ type: String })
  ip: string;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ type: String })
  device: string;

  @Prop({ type: String })
  browser: string;

  @Prop({ type: String })
  os: string;

  @Prop({ type: String })
  country: string;

  @Prop({ type: Date, required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;
}

export type RefreshTokenDocument = RefreshToken & Document;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
