import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationEntityType } from 'src/common/enum/notificationEntityType.enum';
import { ReminderStatus } from 'src/common/enum/reminderStatus.enum';
import { ReminderType } from 'src/common/enum/reminderType.enum';

@Schema({ timestamps: true, collection: 'notification_reminders' })
export class NotificationReminder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ enum: NotificationEntityType, required: true })
  entityType: NotificationEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction' })
  auctionId?: Types.ObjectId;

  @Prop({ enum: ReminderType, required: true })
  reminderType: ReminderType;

  @Prop({ required: true, trim: true })
  recipientPhone: string;

  @Prop({ trim: true })
  messageTemplate?: string;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ type: Date })
  lastSentAt?: Date;

  @Prop({ type: Date, required: true })
  nextSendAt: Date;

  @Prop({ enum: ReminderStatus, default: ReminderStatus.ACTIVE })
  status: ReminderStatus;

  @Prop({ trim: true })
  lastError?: string;
}

export type NotificationReminderDocument = NotificationReminder & Document;
export const NotificationReminderSchema =
  SchemaFactory.createForClass(NotificationReminder);

NotificationReminderSchema.index({ status: 1, nextSendAt: 1 });
NotificationReminderSchema.index({ entityType: 1, entityId: 1, reminderType: 1 });
