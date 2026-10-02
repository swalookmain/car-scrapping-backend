import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { OrganizationLetterSettingsService } from './organization-letter-settings.service';
import { OrganizationFacilitySettingsService } from './organization-facility-settings.service';
import { BooksPeriodService } from './books-period.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: OrganizationLetterSettingsService, useValue: {} },
        { provide: OrganizationFacilitySettingsService, useValue: {} },
        { provide: BooksPeriodService, useValue: {} },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
