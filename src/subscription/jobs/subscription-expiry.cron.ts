import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class SubscriptionExpiryCron {
  private readonly logger = new Logger(SubscriptionExpiryCron.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Cron('0 0 * * *', { timeZone: 'Asia/Kolkata' })
  async handleSubscriptionExpiry() {
    try {
      const count = await this.subscriptionService.expireDueSubscriptions();
      this.logger.log(`Subscription expiry cron processed ${count} records`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Subscription expiry cron failed';
      this.logger.error(msg);
    }
  }
}
