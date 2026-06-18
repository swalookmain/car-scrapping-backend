import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { ReminderStatus } from 'src/common/enum/reminderStatus.enum';
import {
  NotificationReminder,
  NotificationReminderDocument,
} from '../schemas/notification-reminder.schema';

@Injectable()
export class NotificationReminderRepository extends BaseRepository<NotificationReminderDocument> {
  constructor(
    @InjectModel(NotificationReminder.name)
    notificationReminderModel: Model<NotificationReminderDocument>,
  ) {
    super(notificationReminderModel);
  }

  async findDueReminders(now: Date) {
    return this.model
      .find({
        status: ReminderStatus.ACTIVE,
        nextSendAt: { $lte: now },
        dueDate: { $gte: now },
      })
      .limit(500);
  }
}
