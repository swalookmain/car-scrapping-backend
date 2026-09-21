import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AuthRepository } from '../auth/auth.repository';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: {} },
        { provide: OrganizationsService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: AuthRepository, useValue: { deleteRefreshTokenByUserId: jest.fn() } },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
