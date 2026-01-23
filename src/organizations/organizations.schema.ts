import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class organizations {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const organizationsSchema = SchemaFactory.createForClass(organizations);
