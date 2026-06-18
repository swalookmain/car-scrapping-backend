import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SubscriptionType } from './enum/subscription-type.enum';
import { SubscriptionPlan } from './enum/subscription-plan.enum';
import { SubscriptionStatus } from './enum/subscription-status.enum';
import { SubscriptionCreatedBy } from './enum/subscription-created-by.enum';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ enum: SubscriptionType, required: true })
  type: SubscriptionType;

  @Prop({ type: String, enum: SubscriptionPlan, default: null })
  plan: SubscriptionPlan | null;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ enum: SubscriptionCreatedBy, required: true })
  createdBy: SubscriptionCreatedBy;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
