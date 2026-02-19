import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { StorageService } from 'src/common/services/storage.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VehicleComplianceService } from 'src/vehicle-compliance/vehicle-compliance.service';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: InvoiceRepository,
          useValue: {},
        },
        {
          provide: OrganizationsService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: VehicleComplianceService,
          useValue: {},
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
