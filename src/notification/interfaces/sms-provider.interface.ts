export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<SmsResult>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
