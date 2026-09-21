jest.unmock('src/lead/lead.service');
jest.mock('./lead.repository', () => ({ LeadRepository: class LeadRepository {} }));
jest.mock('./lead-document.repository', () => ({
  LeadDocumentRepository: class LeadDocumentRepository {},
}));
jest.mock('src/users/users.repository', () => ({ UsersRepository: class UsersRepository {} }));
jest.mock('src/organizations/organizations.service', () => ({
  OrganizationsService: class OrganizationsService {},
}));
jest.mock('src/common/services/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/yard/yard.service', () => ({ YardService: class YardService {} }));
jest.mock('src/lifting/lifting.service', () => ({ LiftingService: class LiftingService {} }));

import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LeadService } from './lead.service';
import { Role } from 'src/common/enum/role.enum';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

describe('LeadService close / invoice / offer', () => {
  let service: LeadService;
  const leadRepository = {
    findById: jest.fn(),
    updateById: jest.fn(),
  };
  const yardService = {
    ensureYardEntryForLead: jest.fn(),
  };
  const liftingService = {
    createForClosedLead: jest.fn(),
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

  const baseLead = () => ({
    _id: leadId,
    organizationId: orgId,
    status: LeadStatus.IN_PROCESS,
    offerAmount: 10000,
    counterAmount: 9000,
    name: 'Lead',
    registrationNumber: 'MH12AB1234',
    vehicleName: 'Swift',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadService(
      leadRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      yardService as never,
      liftingService as never,
      { error: jest.fn(), log: jest.fn(), warn: jest.fn() } as never,
    );
  });

  it('closes a lead without an invoice and creates yard + lifting', async () => {
    const lead = baseLead();
    leadRepository.findById.mockResolvedValue(lead);
    const closed = { ...lead, status: LeadStatus.CLOSED };
    leadRepository.updateById.mockResolvedValue(closed);
    yardService.ensureYardEntryForLead.mockResolvedValue({
      _id: new Types.ObjectId(),
    });
    liftingService.createForClosedLead.mockResolvedValue({});

    const result = await service.updateLeadStatus(
      leadId.toString(),
      { status: LeadStatus.CLOSED },
      admin,
    );

    expect(result.status).toBe(LeadStatus.CLOSED);
    expect(yardService.ensureYardEntryForLead).toHaveBeenCalled();
    expect(liftingService.createForClosedLead).toHaveBeenCalled();
  });

  it('rejects invoice link on an open lead', async () => {
    leadRepository.findById.mockResolvedValue({
      ...baseLead(),
      status: LeadStatus.OPEN,
    });
    await expect(
      service.validateLeadForInvoiceLink(leadId.toString(), admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second invoice on a closed lead', async () => {
    leadRepository.findById.mockResolvedValue({
      ...baseLead(),
      status: LeadStatus.CLOSED,
      invoiceId: new Types.ObjectId(),
    });
    await expect(
      service.validateLeadForInvoiceLink(leadId.toString(), admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires offer amounts before KYC update', async () => {
    leadRepository.findById.mockResolvedValue({
      ...baseLead(),
      status: LeadStatus.OPEN,
      offerAmount: undefined,
      counterAmount: undefined,
    });
    await expect(
      service.updateLead(
        leadId.toString(),
        { aadhaarNumber: '123412341234' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sets IN_PROCESS when offer amounts are saved on an OPEN lead', async () => {
    leadRepository.findById.mockResolvedValue({
      ...baseLead(),
      status: LeadStatus.OPEN,
      offerAmount: undefined,
      counterAmount: undefined,
    });
    leadRepository.updateById.mockResolvedValue({
      ...baseLead(),
      status: LeadStatus.IN_PROCESS,
    });
    await service.updateLead(
      leadId.toString(),
      { offerAmount: 1, counterAmount: 2 },
      admin,
    );
    expect(leadRepository.updateById).toHaveBeenCalledWith(
      leadId.toString(),
      expect.objectContaining({ status: LeadStatus.IN_PROCESS }),
    );
  });
});
