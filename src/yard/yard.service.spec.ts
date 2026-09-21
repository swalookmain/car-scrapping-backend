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

describe('YardService lead close + invoice attach', () => {
  let service: YardService;
  const yardVehicleRepository = {
    findByLeadId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findById: jest.fn(),
    findByVehicleInvoiceId: jest.fn(),
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
  const liftingService = {
    completeByYardVehicleId: jest.fn(),
    findAssignedYardVehicleIds: jest.fn().mockResolvedValue([]),
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
    yardZoneRepository.findAllByFilter.mockResolvedValue([{ _id: new Types.ObjectId() }]);
    service = new YardService(
      yardVehicleRepository as never,
      yardMovementRepository as never,
      yardZoneRepository as never,
      invoiceRepository as never,
      vehicleInvoiceRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      liftingService as never,
      {} as never,
      { error: jest.fn(), log: jest.fn(), warn: jest.fn() } as never,
    );
  });

  it('creates AWAITING_ARRIVAL yard row on lead close', async () => {
    yardVehicleRepository.findByLeadId.mockResolvedValue(null);
    const created = {
      _id: new Types.ObjectId(),
      currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
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

    expect(result.currentStatus).toBe(YardVehicleStatus.AWAITING_ARRIVAL);
    expect(yardVehicleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId,
        sourceType: YardSourceType.LEAD,
        currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
      }),
    );
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
});
