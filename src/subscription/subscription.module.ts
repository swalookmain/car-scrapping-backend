import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';
import { SubscriptionExpiryCron } from './jobs/subscription-expiry.cron';
import { SubscriptionBootstrap } from './subscription.bootstrap';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    forwardRef(() => OrganizationsModule),
  ],
  providers: [
    SubscriptionRepository,
    SubscriptionService,
    SubscriptionExpiryCron,
    SubscriptionBootstrap,
  ],
  exports: [SubscriptionService, SubscriptionRepository],
})
export class SubscriptionModule {}
