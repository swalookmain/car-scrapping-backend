import { Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationEntityType } from 'src/common/enum/notificationEntityType.enum';
import { ReminderStatus } from 'src/common/enum/reminderStatus.enum';
import { ReminderType } from 'src/common/enum/reminderType.enum';
import { SMS_PROVIDER } from '../interfaces/sms-provider.interface';
import type { SmsProvider } from '../interfaces/sms-provider.interface';
import { NotificationReminderRepository } from '../repositories/notification-reminder.repository';

export interface ScheduleReminderInput {
  organizationId: string;
  entityType: NotificationEntityType;
  entityId: string;
  auctionId?: string;
  reminderType: ReminderType;
  recipientPhone: string;
  amount?: number;
  dueDate: Date;
  auctionNumber?: string;
  lotNumber?: string;
  deliveryOrderNumber?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly reminderRepository: NotificationReminderRepository,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  private buildMessage(input: ScheduleReminderInput): string {
    if (input.reminderType === ReminderType.PAYMENT) {
      return `Reminder: Lot ${input.lotNumber || ''} - Rs.${input.amount ?? 0} due by ${input.dueDate.toLocaleDateString('en-IN')}. Auction ${input.auctionNumber || ''}.`;
    }
    return `Reminder: Please lift vehicles for Lot ${input.lotNumber || ''} by ${input.dueDate.toLocaleDateString('en-IN')}. DO: ${input.deliveryOrderNumber || 'N/A'}.`;
  }

  async scheduleReminder(input: ScheduleReminderInput) {
    if (!input.recipientPhone || input.recipientPhone.length !== 10) {
      this.logger.warn(`Invalid phone for reminder on entity ${input.entityId}`);
      return null;
    }

    await this.cancelReminder(input.entityId, input.reminderType);

    const now = new Date();
    const nextSendAt = new Date(now);
    nextSendAt.setHours(9, 0, 0, 0);
    if (nextSendAt <= now) {
      nextSendAt.setDate(nextSendAt.getDate() + 1);
    }

    return this.reminderRepository.create({
      organizationId: new Types.ObjectId(input.organizationId),
      entityType: input.entityType,
      entityId: new Types.ObjectId(input.entityId),
      auctionId: input.auctionId ? new Types.ObjectId(input.auctionId) : undefined,
      reminderType: input.reminderType,
      recipientPhone: input.recipientPhone,
      amount: input.amount,
      dueDate: input.dueDate,
      nextSendAt,
      status: ReminderStatus.ACTIVE,
      messageTemplate: this.buildMessage(input),
    });
  }

  async cancelReminder(entityId: string, reminderType: ReminderType) {
    await this.reminderRepository['model'].updateMany(
      {
        entityId: new Types.ObjectId(entityId),
        reminderType,
        status: ReminderStatus.ACTIVE,
      },
      { status: ReminderStatus.CANCELLED },
    );
  }

  async completeReminder(entityId: string, reminderType: ReminderType) {
    await this.reminderRepository['model'].updateMany(
      {
        entityId: new Types.ObjectId(entityId),
        reminderType,
        status: ReminderStatus.ACTIVE,
      },
      { status: ReminderStatus.COMPLETED },
    );
  }

  async processDueReminders() {
    const now = new Date();
    const due = await this.reminderRepository.findDueReminders(now);
    for (const reminder of due) {
      const message =
        reminder.messageTemplate ||
        `Reminder for lot. Amount: Rs.${reminder.amount ?? 0}`;
      const result = await this.smsProvider.sendSms(reminder.recipientPhone, message);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      if (result.success) {
        await this.reminderRepository.updateById(reminder._id.toString(), {
          lastSentAt: now,
          nextSendAt: tomorrow,
          lastError: undefined,
        });
      } else {
        await this.reminderRepository.updateById(reminder._id.toString(), {
          lastError: result.error,
          nextSendAt: tomorrow,
        });
      }

      if (now >= reminder.dueDate) {
        await this.reminderRepository.updateById(reminder._id.toString(), {
          status: ReminderStatus.COMPLETED,
        });
      }
    }
    return { processed: due.length };
  }
}
