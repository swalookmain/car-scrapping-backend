jest.unmock('src/lifting/lifting.service');
jest.mock('./lifting-job.repository', () => ({
  LiftingJobRepository: class LiftingJobRepository {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { LiftingService } from './lifting.service';
import { LiftingJobRepository } from './lifting-job.repository';
import { Role } from 'src/common/enum/role.enum';
import { LiftingJobStatus } from 'src/common/enum/liftingJobStatus.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

describe('LiftingService', () => {
  let service: LiftingService;
  const liftingJobRepository = {
    findPaginated: jest.fn(),
    findById: jest.fn(),
    findByLeadId: jest.fn(),
    create: jest.fn(),
    countByFilter: jest.fn(),
    findYardVehicleIdsByAssignee: jest.fn(),
  };

  const orgId = new Types.ObjectId();
  const staffId = new Types.ObjectId();
  const staff: AuthenticatedUser = {
    userId: staffId.toString(),
    role: Role.STAFF,
    orgId: orgId.toString(),
    email: 's@x.com',
    name: 'Staff',
    allowedModules: ['lifting'],
  };
  const admin: AuthenticatedUser = {
    ...staff,
    userId: new Types.ObjectId().toString(),
    role: Role.ADMIN,
    allowedModules: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    liftingJobRepository.findPaginated.mockResolvedValue({ data: [], total: 0 });
    liftingJobRepository.countByFilter.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiftingService,
        { provide: LiftingJobRepository, useValue: liftingJobRepository },
      ],
    }).compile();
    service = module.get(LiftingService);
  });

  it('scopes staff list to assigned jobs', async () => {
    await service.findAll({ tab: 'pending' }, staff);
    const filter = liftingJobRepository.findPaginated.mock.calls[0][0];
    expect(JSON.stringify(filter)).toContain(staffId.toString());
    expect(JSON.stringify(filter)).toContain('assignedTo');
  });

  it('does not add assignedTo filter for admin', async () => {
    await service.findAll({ tab: 'pending' }, admin);
    const filter = liftingJobRepository.findPaginated.mock.calls[0][0];
    expect(JSON.stringify(filter)).toContain(LiftingJobStatus.PENDING);
    expect(JSON.stringify(filter)).not.toContain('assignedTo');
  });

  it('filters pending jobs by expected arrival range', async () => {
    await service.findAll(
      { tab: 'pending', from: '2026-09-01', to: '2026-09-30' },
      admin,
    );
    const filter = JSON.stringify(liftingJobRepository.findPaginated.mock.calls[0][0]);
    expect(filter).toContain('expectedArrivalAt');
  });

  it('summarizes counts in the same org/staff scope', async () => {
    liftingJobRepository.countByFilter
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    const result = await service.summary(
      { from: '2026-09-01', to: '2026-09-30' },
      staff,
    );
    expect(result).toEqual({
      pending: 4,
      upcoming: 3,
      overdue: 1,
      completed: 2,
    });
    expect(liftingJobRepository.countByFilter).toHaveBeenCalledTimes(4);
    const first = JSON.stringify(liftingJobRepository.countByFilter.mock.calls[0][0]);
    expect(first).toContain(staffId.toString());
  });
});
