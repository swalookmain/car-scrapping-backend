import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsResult } from '../interfaces/sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async sendSms(to: string, message: string): Promise<SmsResult> {
    this.logger.log(`[SMS -> ${to}] ${message}`);
    return { success: true, messageId: `console-${Date.now()}` };
  }
}
