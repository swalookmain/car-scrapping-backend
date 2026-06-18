import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ReminderCron {
  private readonly logger = new Logger(ReminderCron.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Cron('0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async handleDailyReminders() {
    try {
      const result = await this.notificationService.processDueReminders();
      this.logger.log(`Processed ${result.processed} due reminders`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Reminder cron failed';
      this.logger.error(msg);
    }
  }
}
