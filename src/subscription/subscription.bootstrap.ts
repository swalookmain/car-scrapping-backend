import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionBootstrap.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async onModuleInit() {
    try {
      const migrated =
        await this.subscriptionService.migrateOrganizationsWithoutSubscription();
      this.logger.log(
        `Subscription bootstrap complete. Migrated ${migrated} organizations.`,
      );
    } catch (error) {
      this.logger.error(
        `Subscription bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
