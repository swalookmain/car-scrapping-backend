import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsResult } from '../interfaces/sms-provider.interface';

@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger(Msg91SmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(to: string, message: string): Promise<SmsResult> {
    const apiKey = this.configService.get<string>('MSG91_API_KEY');
    const senderId = this.configService.get<string>('SMS_SENDER_ID') || 'SCRAP';
    if (!apiKey) {
      this.logger.warn('MSG91_API_KEY not configured');
      return { success: false, error: 'SMS provider not configured' };
    }

    try {
      const url = new URL('https://control.msg91.com/api/v5/flow/');
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: apiKey,
        },
        body: JSON.stringify({
          template_id: this.configService.get<string>('MSG91_TEMPLATE_ID'),
          recipients: [{ mobiles: `91${to}`, message }],
          sender: senderId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: text || 'SMS send failed' };
      }
      const data = (await response.json()) as { request_id?: string };
      return { success: true, messageId: data.request_id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'SMS send failed';
      this.logger.error(msg);
      return { success: false, error: msg };
    }
  }
}
