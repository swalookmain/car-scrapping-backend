import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import { LeadRepository } from './lead.repository';
import { LeadDocumentRepository } from './lead-document.repository';
import { UsersRepository } from 'src/users/users.repository';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { LeadLookupQueryDto } from './dto/lead-lookup-query.dto';
import { UploadLeadDocumentDto } from './dto/upload-lead-document.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';
import { LeadSource } from 'src/common/enum/leadSource.enum';
import { Role } from 'src/common/enum/role.enum';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import { YardService } from 'src/yard/yard.service';
import { LiftingService } from 'src/lifting/lifting.service';
import {
  LeadDocumentRecordDocument,
  LeadDocumentPageSide,
  LeadDocumentType,
} from './lead-document.schema';
import type { LeadDocument } from './lead.schema';
import {
  andMongoFilters,
  staffLeadOwnerFilter,
  staffOwnsLeadRecord,
} from 'src/common/access/data-scope';
import { APP_MODULES, sanitizeStaffModules } from 'src/common/access/app-modules';
import { getLeadWizardProgress } from './lead-wizard.util';

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly leadDocumentRepository: LeadDocumentRepository,
    private readonly usersRepository: UsersRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => YardService))
    private readonly yardService: YardService,
    private readonly liftingService: LiftingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createLead(
    createLeadDto: CreateLeadDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      this.ensureAdmin(authenticatedUser);
      const orgId = this.getOrgId(authenticatedUser);
      await this.assertOrganization(orgId);

      const sanitizedData = this.normalizeLeadData(
        sanitizeObject(createLeadDto) as CreateLeadDto,
      );
      const { purchaseDate, ...restData } = sanitizedData;

      const assignedStaffId = sanitizedData.assignedTo
        ? await this.assertAssignableStaff(sanitizedData.assignedTo, orgId)
        : undefined;

      const createdLead = await this.leadRepository.create({
        ...restData,
        ...(sanitizedData.isInterested === false
          ? { status: LeadStatus.CANCELLED }
          : {}),
        assignedTo: assignedStaffId
          ? new Types.ObjectId(assignedStaffId)
          : undefined,
        organizationId: new Types.ObjectId(orgId),
        createdBy: new Types.ObjectId(authenticatedUser.userId),
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
        ...(purchaseDate
          ? { purchaseDate: new Date(purchaseDate) }
          : {}),
      });

      return createdLead;
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to create lead');
    }
  }

  async getLeads(query: QueryLeadsDto, authenticatedUser: AuthenticatedUser) {
    try {
      const orgId = this.getOrgId(authenticatedUser);
      const base: Record<string, unknown> = {
        organizationId: new Types.ObjectId(orgId),
      };

      if (authenticatedUser.role !== Role.STAFF && query.assignedTo) {
        base.assignedTo = new Types.ObjectId(
          validateObjectId(query.assignedTo, 'Assigned staff ID'),
        );
      }
      if (query.status) {
        base.status = query.status;
      }

      const search = query.q?.trim()
        ? {
            $or: [
              { name: new RegExp(query.q.trim(), 'i') },
              { ownerName: new RegExp(query.q.trim(), 'i') },
              { vehicleName: new RegExp(query.q.trim(), 'i') },
              { mobileNumber: new RegExp(query.q.trim(), 'i') },
              { location: new RegExp(query.q.trim(), 'i') },
            ],
          }
        : null;

      const filter = andMongoFilters(
        base,
        staffLeadOwnerFilter(authenticatedUser),
        search,
      );

      const { page, limit } = getPagination(
        query.page ? Number(query.page) : 1,
        query.limit ? Number(query.limit) : 10,
      );
      const { data, total } = await this.leadRepository.findPaginatedWithUsers(
        filter,
        page,
        limit,
      );

      const leadIds = data.map((row) => String(row._id));
      const docsByLead = await this.leadDocumentRepository.findTypesByLeadIds(
        orgId,
        leadIds,
      );
      const withWizard = data.map((row) => {
        const docs = docsByLead.get(String(row._id)) || [];
        return {
          ...row,
          ...getLeadWizardProgress(row, docs),
        };
      });

      return {
        data: withWizard,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to fetch leads');
    }
  }

  async getLeadById(id: string, authenticatedUser: AuthenticatedUser) {
    const leadId = validateObjectId(id, 'Lead ID');
    const lead = await this.leadRepository.findByIdWithUsers(leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    this.ensureLeadAccessible(
      lead as unknown as LeadDocument,
      authenticatedUser,
      'view',
    );

    const documents = await this.leadDocumentRepository.findByLeadAndOrg(
      leadId,
      this.getOrgId(authenticatedUser),
    );

    return { ...lead, documents };
  }

  async updateLead(
    id: string,
    updateLeadDto: UpdateLeadDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      this.ensureLeadAccessible(lead, authenticatedUser, 'update');
      this.assertLeadMutable(lead);

      const sanitizedData = this.normalizeLeadData(
        sanitizeObject(updateLeadDto) as UpdateLeadDto,
      );

      delete sanitizedData.assignedTo;

      this.assertOfferCompleteForLaterSteps(lead, sanitizedData);

      const nextOffer =
        sanitizedData.offerAmount ?? lead.offerAmount;
      const nextCounter =
        sanitizedData.counterAmount ?? lead.counterAmount;
      const offerJustCompleted =
        nextOffer != null &&
        nextCounter != null &&
        lead.status === LeadStatus.OPEN;

      const updatedLead = await this.leadRepository.updateById(leadId, {
        ...sanitizedData,
        ...(sanitizedData.isInterested === false
          ? { status: LeadStatus.CANCELLED }
          : {}),
        ...(sanitizedData.isInterested === true && lead.status === LeadStatus.CANCELLED
          ? { status: LeadStatus.OPEN }
          : {}),
        ...(offerJustCompleted ? { status: LeadStatus.IN_PROCESS } : {}),
        ...(sanitizedData.purchaseDate
          ? { purchaseDate: new Date(sanitizedData.purchaseDate) }
          : {}),
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
      });

      return updatedLead;
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to update lead');
    }
  }

  async assignLead(
    id: string,
    assignLeadDto: AssignLeadDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      this.ensureAdmin(authenticatedUser);
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      this.assertLeadMutable(lead);

      const orgId = this.getOrgId(authenticatedUser);
      const staffId = await this.assertAssignableStaff(assignLeadDto.staffId, orgId);

      return this.leadRepository.updateById(leadId, {
        assignedTo: new Types.ObjectId(staffId),
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
      });
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to assign lead');
    }
  }

  async updateLeadStatus(
    id: string,
    updateLeadStatusDto: UpdateLeadStatusDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      this.ensureLeadAccessible(lead, authenticatedUser, 'status');

      if (
        lead.status === LeadStatus.CLOSED &&
        updateLeadStatusDto.status !== LeadStatus.CLOSED
      ) {
        throw new BadRequestException('Closed leads cannot change status');
      }

      if (updateLeadStatusDto.status === LeadStatus.CLOSED) {
        return this.closeDeal(lead, updateLeadStatusDto, authenticatedUser);
      }

      return this.leadRepository.updateById(leadId, {
        status: updateLeadStatusDto.status,
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
      });
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to update lead status');
    }
  }

  async deleteLead(id: string, authenticatedUser: AuthenticatedUser) {
    try {
      this.ensureAdmin(authenticatedUser);
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      const orgId = this.getOrgId(authenticatedUser);
      if (lead.organizationId?.toString() !== orgId) {
        throw new ForbiddenException('Lead does not belong to organization');
      }
      if (lead.invoiceId) {
        throw new BadRequestException('Cannot delete lead linked to an invoice');
      }
      if (lead.status === LeadStatus.CLOSED) {
        throw new BadRequestException('Closed leads cannot be deleted');
      }
      await this.leadRepository.deleteById(leadId);
      return { message: 'Lead deleted successfully' };
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to delete lead');
    }
  }

  async uploadDocuments(
    id: string,
    uploadLeadDocumentDto: UploadLeadDocumentDto,
    files: {
      aadhaarFront?: UploadFile[];
      aadhaarBack?: UploadFile[];
      rcFront?: UploadFile[];
      rcBack?: UploadFile[];
      pan?: UploadFile[];
      bankDetail?: UploadFile[];
      vehicleFront?: UploadFile[];
      vehicleRight?: UploadFile[];
      vehicleEngine?: UploadFile[];
      vehicleLeft?: UploadFile[];
      vehicleBack?: UploadFile[];
      vehicleInterior?: UploadFile[];
      cod?: UploadFile[];
    },
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      this.ensureLeadAccessible(
        lead,
        authenticatedUser,
        lead.status === LeadStatus.CLOSED ? 'status' : 'update',
      );
      const extraFiles = [
        files.aadhaarFront?.[0],
        files.aadhaarBack?.[0],
        files.rcFront?.[0],
        files.rcBack?.[0],
        files.pan?.[0],
        files.bankDetail?.[0],
        files.vehicleFront?.[0],
        files.vehicleRight?.[0],
        files.vehicleEngine?.[0],
        files.vehicleLeft?.[0],
        files.vehicleBack?.[0],
        files.vehicleInterior?.[0],
      ].some(Boolean);
      const hasCodOnly = Boolean(files.cod?.[0]) && !extraFiles;
      if (!(lead.status === LeadStatus.CLOSED && hasCodOnly)) {
        this.assertLeadMutable(lead);
      }

      const orgId = this.getOrgId(authenticatedUser);
      const aadhaarPageMode = uploadLeadDocumentDto.aadhaarPageMode || 'single';
      const rcPageMode = uploadLeadDocumentDto.rcPageMode || 'single';
      const resolvedFiles: Array<{
        file: UploadFile;
        documentType: LeadDocumentType;
        pageMode: 'single' | 'double';
        pageSide: LeadDocumentPageSide;
      }> = [];

      this.pushLeadDocument(
        resolvedFiles,
        files.aadhaarFront?.[0],
        'aadhaar',
        aadhaarPageMode,
        aadhaarPageMode === 'double' ? 'front' : 'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.aadhaarBack?.[0],
        'aadhaar',
        aadhaarPageMode,
        'back',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.rcFront?.[0],
        'rc',
        rcPageMode,
        rcPageMode === 'double' ? 'front' : 'single',
      );
      this.pushLeadDocument(resolvedFiles, files.rcBack?.[0], 'rc', rcPageMode, 'back');
      this.pushLeadDocument(resolvedFiles, files.pan?.[0], 'pan', 'single', 'single');
      this.pushLeadDocument(
        resolvedFiles,
        files.bankDetail?.[0],
        'bankDetail',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleFront?.[0],
        'vehicleFront',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleRight?.[0],
        'vehicleRight',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleEngine?.[0],
        'vehicleEngine',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleLeft?.[0],
        'vehicleLeft',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleBack?.[0],
        'vehicleBack',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.vehicleInterior?.[0],
        'vehicleInterior',
        'single',
        'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.cod?.[0],
        'cod',
        'single',
        'single',
      );

      if (aadhaarPageMode === 'double') {
        if (files.aadhaarFront?.[0] && !files.aadhaarBack?.[0]) {
          throw new BadRequestException(
            'Aadhaar back page is required for double-page upload',
          );
        }
      }
      if (rcPageMode === 'double') {
        if (files.rcFront?.[0] && !files.rcBack?.[0]) {
          throw new BadRequestException(
            'RC back page is required for double-page upload',
          );
        }
      }

      if (resolvedFiles.length === 0) {
        return { message: 'No documents uploaded', documents: [] };
      }

      resolvedFiles.forEach(({ file }) => assertSupportedDocumentFile(file));

      const prefix = `lead-documents/${orgId}/${leadId}`;
      const saved = await Promise.all(
        resolvedFiles.map(async ({ file, documentType, pageMode, pageSide }) => {
          const upload = await this.storageService.uploadFile(file, prefix);
          return this.leadDocumentRepository.replaceDocument(
            {
              leadId: new Types.ObjectId(leadId),
              documentType,
              pageSide,
            },
            {
              leadId: new Types.ObjectId(leadId),
              organizationId: new Types.ObjectId(orgId),
              uploadedBy: new Types.ObjectId(authenticatedUser.userId),
              documentType,
              pageMode,
              pageSide,
              fileName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: upload.url,
              storageKey: upload.storageKey,
              provider: upload.provider,
            },
          );
        }),
      );

      const codDoc = saved.find((doc) => doc.documentType === 'cod');
      if (codDoc) {
        await this.leadRepository.updateById(leadId, {
          codDocumentUrl: codDoc.url,
          codStorageKey: codDoc.storageKey,
        });
      }

      return { message: 'Lead documents uploaded', documents: saved };
    } catch (error) {
      this.rethrowKnown(error);
      this.logAndThrow(error, 'Failed to upload lead documents');
    }
  }

  async getLeadDocuments(id: string, authenticatedUser: AuthenticatedUser) {
    const leadId = validateObjectId(id, 'Lead ID');
    const lead = await this.requireLead(leadId);
    this.ensureLeadAccessible(lead, authenticatedUser, 'view');
    return this.leadDocumentRepository.findByLeadAndOrg(
      leadId,
      this.getOrgId(authenticatedUser),
    );
  }

  async searchLeadLookup(
    query: LeadLookupQueryDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const ownerUserId =
      authenticatedUser.role === Role.STAFF ? authenticatedUser.userId : undefined;
    return this.leadRepository.findLookupCandidates(
      orgId,
      query.q,
      ownerUserId,
    );
  }

  async getLeadLookupById(id: string, authenticatedUser: AuthenticatedUser) {
    const lead = await this.getLeadById(id, authenticatedUser);
    if (lead.status !== LeadStatus.CLOSED) {
      throw new BadRequestException('Only closed deals can be invoiced');
    }
    if (lead.invoiceId) {
      throw new BadRequestException('Lead is already linked to an invoice');
    }
    if (lead.isInterested === false) {
      throw new BadRequestException('Lead is marked as not interested');
    }
    return lead;
  }

  async validateLeadForInvoiceLink(
    leadId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const validLeadId = validateObjectId(leadId, 'Lead ID');
    const lead = await this.requireLead(validLeadId);
    this.ensureLeadAccessible(lead, authenticatedUser, 'invoice');

    if (lead.status !== LeadStatus.CLOSED) {
      throw new BadRequestException('Invoice can only be created after the deal is closed');
    }
    if (lead.isInterested === false) {
      throw new BadRequestException('Not interested leads cannot be linked to invoices');
    }
    if (lead.invoiceId) {
      throw new BadRequestException('Lead is already linked to an invoice');
    }

    return lead;
  }

  async linkInvoiceToLead(
    leadId: string,
    invoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const lead = await this.validateLeadForInvoiceLink(leadId, authenticatedUser);
    await this.leadRepository.updateById(lead._id.toString(), {
      invoiceId: new Types.ObjectId(validateObjectId(invoiceId, 'Invoice ID')),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async getRequiredDocumentSummary(
    leadId: string,
    orgId: string,
  ): Promise<LeadDocumentRecordDocument[]> {
    return this.leadDocumentRepository.findByLeadAndOrg(leadId, orgId);
  }

  private hasOfferAmounts(lead: {
    offerAmount?: number;
    counterAmount?: number;
  }) {
    return lead.offerAmount != null && lead.counterAmount != null;
  }

  private assertOfferCompleteForLaterSteps(
    lead: { offerAmount?: number; counterAmount?: number },
    incoming: UpdateLeadDto,
  ) {
    const nextOffer = incoming.offerAmount ?? lead.offerAmount;
    const nextCounter = incoming.counterAmount ?? lead.counterAmount;
    const laterKeys: Array<keyof UpdateLeadDto> = [
      'aadhaarNumber',
      'aadhaarLinkedMobileNumber',
      'panNumber',
      'bankAccountNumber',
      'bankIfscCode',
      'bankBranchName',
      'bankName',
      'email',
    ];
    const touchesLater = laterKeys.some((key) => incoming[key] !== undefined);
    if (touchesLater && (nextOffer == null || nextCounter == null)) {
      throw new BadRequestException(
        'Offer amount and counter amount are required before KYC',
      );
    }
  }

  private async closeDeal(
    lead: LeadDocument,
    dto: UpdateLeadStatusDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    if (!this.hasOfferAmounts(lead)) {
      throw new BadRequestException(
        'Offer and counter amounts are required before closing the deal',
      );
    }

    const orgId = this.getOrgId(authenticatedUser);
    let liftingStaffId: string | undefined;
    let liftingStaffName: string | undefined;
    if (dto.liftingStaffId) {
      liftingStaffId = await this.assertLiftingStaff(
        dto.liftingStaffId,
        orgId,
      );
      const staff = await this.usersRepository.findById(liftingStaffId);
      liftingStaffName = staff?.name;
    }

    const expectedArrivalAt = dto.expectedArrivalAt
      ? new Date(dto.expectedArrivalAt)
      : lead.expectedArrivalAt;

    const updated = await this.leadRepository.updateById(lead._id.toString(), {
      status: LeadStatus.CLOSED,
      closedAt: lead.closedAt || new Date(),
      closedBy: lead.closedBy || new Types.ObjectId(authenticatedUser.userId),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
      ...(dto.closingAmount != null ? { closingAmount: dto.closingAmount } : {}),
      ...(dto.codNumber ? { codNumber: dto.codNumber.trim() } : {}),
      ...(dto.codInwardNumber
        ? { codInwardNumber: dto.codInwardNumber.trim() }
        : {}),
      ...(liftingStaffId
        ? { liftingStaffId: new Types.ObjectId(liftingStaffId) }
        : {}),
      ...(expectedArrivalAt ? { expectedArrivalAt } : {}),
    });

    const yardVehicle = await this.yardService.ensureYardEntryForLead(
      updated || lead,
      authenticatedUser,
    );

    await this.liftingService.createForClosedLead({
      organizationId: orgId,
      leadId: lead._id.toString(),
      yardVehicleId: yardVehicle?._id?.toString(),
      assignedTo: liftingStaffId || lead.liftingStaffId?.toString(),
      expectedArrivalAt,
      createdBy: authenticatedUser.userId,
      snapshot: {
        leadName: lead.name,
        ownerName: lead.ownerName,
        registrationNumber: lead.registrationNumber,
        vehicleName: lead.vehicleName,
        variant: lead.variant,
        closingAmount: dto.closingAmount ?? lead.closingAmount,
        codNumber: dto.codNumber || lead.codNumber,
        assignedStaffName: liftingStaffName,
      },
    });

    return updated;
  }

  private async requireLead(leadId: string) {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  private ensureLeadAccessible(
    lead: LeadDocument | (Record<string, unknown> & { _id?: unknown }),
    authenticatedUser: AuthenticatedUser,
    mode: 'view' | 'update' | 'status' | 'invoice',
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const leadOrgId = this.extractObjectIdString(lead.organizationId);
    if (leadOrgId !== orgId) {
      throw new ForbiddenException('Lead does not belong to organization');
    }

    if (authenticatedUser.role === Role.ADMIN) {
      return;
    }

    if (
      authenticatedUser.role === Role.STAFF &&
      staffOwnsLeadRecord(lead, authenticatedUser)
    ) {
      if (mode === 'update' && lead.status === LeadStatus.CLOSED) {
        throw new BadRequestException('Closed leads cannot be updated');
      }
      return;
    }

    throw new ForbiddenException('You do not have access to this lead');
  }

  private assertLeadMutable(lead: LeadDocument | Record<string, unknown>) {
    if (lead.status === LeadStatus.CLOSED) {
      throw new BadRequestException('Closed leads cannot be modified');
    }
  }

  private async assertAssignableStaff(staffId: string, orgId: string) {
    const userId = validateObjectId(staffId, 'Staff ID');
    const staff = await this.usersRepository.findById(userId);
    if (!staff) {
      throw new NotFoundException('Staff user not found');
    }
    if (staff.role !== Role.STAFF) {
      throw new BadRequestException('Lead can only be assigned to staff users');
    }
    if (staff.organizationId?.toString() !== orgId) {
      throw new BadRequestException(
        'Lead can only be assigned within the same organization',
      );
    }

    return userId;
  }

  private async assertLiftingStaff(staffId: string, orgId: string) {
    const userId = await this.assertAssignableStaff(staffId, orgId);
    const staff = await this.usersRepository.findById(userId);
    const modules = sanitizeStaffModules(staff?.allowedModules);
    if (!modules.includes(APP_MODULES.LIFTING.id)) {
      throw new BadRequestException(
        'Lifting can only be assigned to staff with the lifting module',
      );
    }
    return userId;
  }

  private normalizeLeadData<T extends Partial<CreateLeadDto | UpdateLeadDto>>(data: T) {
    if (data.last5ChassisNumber) {
      data.last5ChassisNumber = data.last5ChassisNumber.toUpperCase();
    }
    if (data.registrationNumber) {
      data.registrationNumber = data.registrationNumber
        .toUpperCase()
        .replace(/[\s-]+/g, '');
    }
    if (data.mobileNumber) {
      data.mobileNumber = data.mobileNumber.replace(/\s+/g, '');
    }
    if (data.aadhaarLinkedMobileNumber) {
      data.aadhaarLinkedMobileNumber =
        data.aadhaarLinkedMobileNumber.replace(/\s+/g, '');
    }
    if (data.yearOfManufacture) {
      const year = Number(data.yearOfManufacture);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        throw new BadRequestException(
          `Year of registration must be between 1900 and ${currentYear + 1}`,
        );
      }
    }
    if (!data.leadSource) {
      data.leadSource = LeadSource.WEBSITE;
    }
    return data;
  }

  private pushLeadDocument(
    files: Array<{
      file: UploadFile;
      documentType: LeadDocumentType;
      pageMode: 'single' | 'double';
      pageSide: LeadDocumentPageSide;
    }>,
    file: UploadFile | undefined,
    documentType: LeadDocumentType,
    pageMode: 'single' | 'double',
    pageSide: LeadDocumentPageSide,
  ) {
    if (file) {
      files.push({ file, documentType, pageMode, pageSide });
    }
  }

  private ensureAdmin(authenticatedUser: AuthenticatedUser) {
    if (authenticatedUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async assertOrganization(orgId: string) {
    await this.organizationsService.getById(orgId);
  }

  async getOwnedLeadIds(authenticatedUser: AuthenticatedUser) {
    if (authenticatedUser.role !== Role.STAFF) {
      return [] as Types.ObjectId[];
    }
    return this.leadRepository.findOwnedLeadIds(
      this.getOrgId(authenticatedUser),
      authenticatedUser.userId,
    );
  }

  private getOrgId(authenticatedUser: AuthenticatedUser) {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }

  private rethrowKnown(error: unknown) {
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
  }

  private logAndThrow(error: unknown, message: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(errorMessage, errorStack, 'LeadService');
    throw new BadRequestException(message);
  }

  private extractObjectIdString(value: unknown): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
      const nestedId = (value as { _id?: unknown })._id;
      if (typeof nestedId === 'string') {
        return nestedId;
      }
      if (nestedId instanceof Types.ObjectId) {
        return nestedId.toString();
      }
    }
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    return '';
  }
}
