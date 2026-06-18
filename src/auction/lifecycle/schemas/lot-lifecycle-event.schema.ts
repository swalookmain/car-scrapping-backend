import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LotLifecycleEventType } from 'src/common/enum/lotLifecycleEventType.enum';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'lot_lifecycle_events' })
export class LotLifecycleEvent extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ enum: LotLifecycleEventType, required: true })
  eventType: LotLifecycleEventType;

  @Prop({ enum: LotOutcomeStatus })
  fromOutcome?: LotOutcomeStatus;

  @Prop({ enum: LotOutcomeStatus })
  toOutcome?: LotOutcomeStatus;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;
}

export type LotLifecycleEventDocument = LotLifecycleEvent & Document;
export const LotLifecycleEventSchema = SchemaFactory.createForClass(LotLifecycleEvent);

LotLifecycleEventSchema.index({ lotId: 1, createdAt: -1 });
LotLifecycleEventSchema.index({ organizationId: 1, auctionId: 1 });
