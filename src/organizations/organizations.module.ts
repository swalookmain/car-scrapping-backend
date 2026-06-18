import { Module, forwardRef } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { organizations, organizationsSchema } from './organizations.schema';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { OrganizationsRepository } from './organizations.repository';
import { SubscriptionModule } from '../subscription/subscription.module';
import {
  OrganizationLetterSettings,
  OrganizationLetterSettingsSchema,
} from './organization-letter-settings.schema';
import { OrganizationLetterSettingsRepository } from './organization-letter-settings.repository';
import { OrganizationLetterSettingsService } from './organization-letter-settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: organizations.name, schema: organizationsSchema },
      {
        name: OrganizationLetterSettings.name,
        schema: OrganizationLetterSettingsSchema,
      },
    ]),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationLetterSettingsRepository,
    OrganizationLetterSettingsService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationLetterSettingsService,
    OrganizationLetterSettingsRepository,
  ],
})
export class OrganizationsModule {}
