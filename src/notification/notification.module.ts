import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SMS_PROVIDER } from './interfaces/sms-provider.interface';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { Msg91SmsProvider } from './providers/msg91-sms.provider';
import { NotificationReminderRepository } from './repositories/notification-reminder.repository';
import {
  NotificationReminder,
  NotificationReminderSchema,
} from './schemas/notification-reminder.schema';
import { NotificationService } from './services/notification.service';
import { ReminderCron } from './jobs/reminder.cron';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: NotificationReminder.name, schema: NotificationReminderSchema },
    ]),
  ],
  providers: [
    NotificationReminderRepository,
    NotificationService,
    ReminderCron,
    ConsoleSmsProvider,
    Msg91SmsProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsoleSmsProvider,
        msg91Provider: Msg91SmsProvider,
      ) => {
        const provider = configService.get<string>('SMS_PROVIDER');
        if (provider === 'msg91' && configService.get<string>('MSG91_API_KEY')) {
          return msg91Provider;
        }
        return consoleProvider;
      },
      inject: [ConfigService, ConsoleSmsProvider, Msg91SmsProvider],
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
