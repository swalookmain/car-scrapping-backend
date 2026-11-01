jest.unmock('src/yard/yard.service');
jest.mock('./yard-vehicle.repository', () => ({
  YardVehicleRepository: class YardVehicleRepository {},
}));
jest.mock('./yard-movement.repository', () => ({
  YardMovementRepository: class YardMovementRepository {},
}));
jest.mock('./yard-zone.repository', () => ({
  YardZoneRepository: class YardZoneRepository {},
}));
jest.mock('src/invoice/invoice.repository', () => ({
  InvoiceRepository: class InvoiceRepository {},
}));
jest.mock('src/invoice/vehicle-invoice.repository', () => ({
  VehicleInvoiceRepository: class VehicleInvoiceRepository {},
}));
jest.mock('src/auction/auction-lot.repository', () => ({
  AuctionLotRepository: class AuctionLotRepository {},
}));
jest.mock('src/auction/auction-vehicle.repository', () => ({
  AuctionVehicleRepository: class AuctionVehicleRepository {},
}));
jest.mock('src/auction/auction.repository', () => ({
  AuctionRepository: class AuctionRepository {},
}));
jest.mock('src/lead/lead.service', () => ({ LeadService: class LeadService {} }));
jest.mock('src/lifting/lifting.service', () => ({
  LiftingService: class LiftingService {},
}));
jest.mock('src/audit-log/audit-log.service', () => ({
  AuditLogService: class AuditLogService {},
}));

import { Types } from 'mongoose';
import { YardService } from './yard.service';
import { Role } from 'src/common/enum/role.enum';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';
import { YardSourceType } from 'src/common/enum/yardSourceType.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

describe('YardService canonical vehicle id', () => {
  let service: YardService;
  const yardVehicleRepository = {
    findByLeadId: jest.fn(),
    findByAuctionVehicleId: jest.fn(),
    findByAuctionVehicleIds: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findById: jest.fn(),
    findByVehicleInvoiceId: jest.fn(),
    deleteById: jest.fn(),
    findPaginated: jest.fn(),
  };
  const yardMovementRepository = {
    create: jest.fn(),
  };
  const yardZoneRepository = {
    findAllByFilter: jest.fn(),
  };
  const invoiceRepository = {
    findById: jest.fn(),
  };
  const vehicleInvoiceRepository = {
    findAllByFilter: jest.fn(),
  };
  const auctionLotRepository = {
    findByOrgAndId: jest.fn(),
  };
  const auctionVehicleRepository = {
    findByLot: jest.fn(),
  };
  const auctionRepository = {};
  const liftingService = {
    completeByYardVehicleId: jest.fn(),
    findAssignedYardVehicleIds: jest.fn().mockResolvedValue([]),
  };
  const auditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const orgId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const leadId = new Types.ObjectId();
  const admin: AuthenticatedUser = {
    userId: userId.toString(),
    role: Role.ADMIN,
    orgId: orgId.toString(),
    email: 'a@x.com',
    name: 'Admin',
    allowedModules: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    yardZoneRepository.findAllByFilter.mockResolvedValue([
      { _id: new Types.ObjectId() },
    ]);
    service = new YardService(
      yardVehicleRepository as never,
      yardMovementRepository as never,
      yardZoneRepository as never,
      invoiceRepository as never,
      vehicleInvoiceRepository as never,
      auctionLotRepository as never,
      auctionVehicleRepository as never,
      auctionRepository as never,
      {} as never,
      liftingService as never,
      auditLogService as never,
      { error: jest.fn(), log: jest.fn(), warn: jest.fn() } as never,
      { assertOpen: jest.fn().mockResolvedValue(undefined) } as never,
    );
  });

  it('creates REGISTERED yard row when lead vehicle details are first saved', async () => {
    yardVehicleRepository.findByLeadId.mockResolvedValue(null);
    const created = {
      _id: new Types.ObjectId(),
      currentStatus: YardVehicleStatus.REGISTERED,
    };
    yardVehicleRepository.create.mockResolvedValue(created);

    const result = await service.ensureYardEntryForLead(
      {
        _id: leadId,
        registrationNumber: 'MH12AB1234',
        vehicleName: 'Swift',
        variant: 'VXI',
      },
      admin,
    );

    expect(result.currentStatus).toBe(YardVehicleStatus.REGISTERED);
    expect(yardVehicleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId,
        sourceType: YardSourceType.LEAD,
        currentStatus: YardVehicleStatus.REGISTERED,
      }),
    );
    expect(yardMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'LEAD_VEHICLE_INSERT',
        toStatus: YardVehicleStatus.REGISTERED,
      }),
    );
  });

  it('promotes REGISTERED → AWAITING_ARRIVAL on deal close without new id', async () => {
    const yardId = new Types.ObjectId();
    const existing = {
      _id: yardId,
      currentStatus: YardVehicleStatus.REGISTERED,
    };
    yardVehicleRepository.findByLeadId.mockResolvedValue(existing);
    yardVehicleRepository.updateById.mockResolvedValue({
      ...existing,
      currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
    });
    yardVehicleRepository.findById.mockResolvedValue({
      ...existing,
      currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
    });

    const result = await service.ensureYardEntryForLead(
      {
        _id: leadId,
        registrationNumber: 'MH12AB1234',
        vehicleName: 'Swift',
        variant: 'VXI',
      },
      admin,
      { promoteToAwaitingArrival: true },
    );

    expect(yardVehicleRepository.create).not.toHaveBeenCalled();
    expect(yardVehicleRepository.updateById).toHaveBeenCalledWith(
      yardId.toString(),
      expect.objectContaining({
        currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
      }),
    );
    expect(result._id.toString()).toBe(yardId.toString());
  });

  it('creates REGISTERED yard row when auction vehicle is inserted', async () => {
    const auctionVehicleId = new Types.ObjectId();
    const auctionId = new Types.ObjectId();
    const lotId = new Types.ObjectId();
    yardVehicleRepository.findByAuctionVehicleId.mockResolvedValue(null);
    const created = {
      _id: new Types.ObjectId(),
      currentStatus: YardVehicleStatus.REGISTERED,
      auctionVehicleId,
    };
    yardVehicleRepository.create.mockResolvedValue(created);

    const result = await service.ensureYardEntryForAuctionVehicle(
      {
        _id: auctionVehicleId,
        auctionId,
        lotId,
        registrationNumber: 'MH14CD5678',
        make: 'Honda',
        vehicleModel: 'City',
      },
      admin,
    );

    expect(result._id).toEqual(created._id);
    expect(yardVehicleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        auctionVehicleId,
        sourceType: YardSourceType.AUCTION,
        currentStatus: YardVehicleStatus.REGISTERED,
      }),
    );
  });

  it('parks auction vehicle by updating same yardVehicleId (no duplicate)', async () => {
    const auctionVehicleId = new Types.ObjectId();
    const yardId = new Types.ObjectId();
    const zoneId = new Types.ObjectId();
    const lotId = new Types.ObjectId();

    auctionLotRepository.findByOrgAndId.mockResolvedValue({
      _id: lotId,
      outcomeStatus: 'DEAL_DONE',
    });
    yardZoneRepository.findAllByFilter.mockResolvedValue([{ _id: zoneId }]);
    // zone lookup by id — add findById for zones used in addFromAuction
    (yardZoneRepository as { findById?: jest.Mock }).findById = jest
      .fn()
      .mockResolvedValue({
        _id: zoneId,
        organizationId: orgId,
      });

    auctionVehicleRepository.findByLot.mockResolvedValue([
      {
        _id: auctionVehicleId,
        registrationNumber: 'MH14CD5678',
        make: 'Honda',
        vehicleModel: 'City',
      },
    ]);

    const existingYard = {
      _id: yardId,
      auctionVehicleId,
      currentStatus: YardVehicleStatus.REGISTERED,
      organizationId: orgId,
    };
    yardVehicleRepository.findByAuctionVehicleIds.mockResolvedValue([
      existingYard,
    ]);
    yardVehicleRepository.updateById.mockResolvedValue({
      ...existingYard,
      currentStatus: YardVehicleStatus.PARKED,
    });

    const result = await service.addFromAuction(
      {
        lotId: lotId.toString(),
        zoneId: zoneId.toString(),
        auctionVehicleIds: [auctionVehicleId.toString()],
      },
      admin,
    );

    expect(yardVehicleRepository.create).not.toHaveBeenCalled();
    expect(yardVehicleRepository.updateById).toHaveBeenCalledWith(
      yardId.toString(),
      expect.objectContaining({
        currentStatus: YardVehicleStatus.PARKED,
      }),
    );
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('does not duplicate yard row when invoice is confirmed', async () => {
    const invoiceId = new Types.ObjectId();
    const existingYard = {
      _id: new Types.ObjectId(),
      vehicleInvoiceId: undefined,
    };
    invoiceRepository.findById.mockResolvedValue({
      _id: invoiceId,
      leadId,
    });
    vehicleInvoiceRepository.findAllByFilter.mockResolvedValue([
      { _id: new Types.ObjectId(), registration_number: 'MH12AB1234' },
    ]);
    yardVehicleRepository.findByLeadId.mockResolvedValue(existingYard);
    yardVehicleRepository.findByVehicleInvoiceId.mockResolvedValue(null);
    yardVehicleRepository.updateById.mockResolvedValue(existingYard);

    await service.ensureYardEntriesForInvoice(invoiceId.toString(), admin);

    expect(yardVehicleRepository.create).not.toHaveBeenCalled();
    expect(yardVehicleRepository.updateById).toHaveBeenCalledWith(
      existingYard._id.toString(),
      expect.objectContaining({
        invoiceId,
      }),
    );
  });

  it('completes lifting on GATE_IN', async () => {
    const yardId = new Types.ObjectId();
    const yardVehicle = {
      _id: yardId,
      organizationId: orgId,
      currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
    };
    yardVehicleRepository.findById.mockResolvedValue(yardVehicle);
    yardVehicleRepository.updateById.mockResolvedValue({
      ...yardVehicle,
      currentStatus: YardVehicleStatus.GATE_IN,
    });

    await service.updateStatus(
      yardId.toString(),
      { status: YardVehicleStatus.GATE_IN },
      admin,
    );

    expect(liftingService.completeByYardVehicleId).toHaveBeenCalledWith(
      yardId.toString(),
    );
  });

  it('hides REGISTERED from default yard list', async () => {
    yardVehicleRepository.findPaginated.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.findAll({ page: 1, limit: 20 } as never, admin);

    expect(yardVehicleRepository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStatus: { $ne: YardVehicleStatus.REGISTERED },
      }),
      1,
      20,
      expect.anything(),
      expect.anything(),
    );
  });
});
