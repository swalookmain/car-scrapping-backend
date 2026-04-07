import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
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
import { getPagination } from 'src/common/utils/pagination.util';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';
import { LeadSource } from 'src/common/enum/leadSource.enum';
import { Role } from 'src/common/enum/role.enum';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import {
  LeadDocumentRecordDocument,
  LeadDocumentPageSide,
  LeadDocumentType,
} from './lead-document.schema';
import type { LeadDocument } from './lead.schema';

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly leadDocumentRepository: LeadDocumentRepository,
    private readonly usersRepository: UsersRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly storageService: StorageService,
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
      const filter: Record<string, unknown> = {
        organizationId: new Types.ObjectId(orgId),
      };

      if (authenticatedUser.role === Role.STAFF) {
        filter.assignedTo = new Types.ObjectId(authenticatedUser.userId);
      } else if (query.assignedTo) {
        filter.assignedTo = new Types.ObjectId(
          validateObjectId(query.assignedTo, 'Assigned staff ID'),
        );
      }

      if (query.status) {
        filter.status = query.status;
      }

      if (query.q?.trim()) {
        const pattern = new RegExp(query.q.trim(), 'i');
        filter.$or = [
          { name: pattern },
          { vehicleName: pattern },
          { mobileNumber: pattern },
          { location: pattern },
        ];
      }

      const { page, limit } = getPagination(
        query.page ? Number(query.page) : 1,
        query.limit ? Number(query.limit) : 10,
      );
      const { data, total } = await this.leadRepository.findPaginatedWithUsers(
        filter,
        page,
        limit,
      );

      return {
        data,
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

      const updatedLead = await this.leadRepository.updateById(leadId, {
        ...sanitizedData,
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

      if (updateLeadStatusDto.status === LeadStatus.CLOSED) {
        throw new BadRequestException(
          'Lead can only be closed when the invoice is confirmed',
        );
      }

      if (lead.status === LeadStatus.CLOSED) {
        throw new BadRequestException('Closed leads cannot change status');
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

  async uploadDocuments(
    id: string,
    pageMode: 'single' | 'double',
    files: {
      aadhaarFront?: UploadFile[];
      aadhaarBack?: UploadFile[];
      rcFront?: UploadFile[];
      rcBack?: UploadFile[];
      pan?: UploadFile[];
      bankDetail?: UploadFile[];
    },
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      this.ensureAdmin(authenticatedUser);
      const leadId = validateObjectId(id, 'Lead ID');
      const lead = await this.requireLead(leadId);
      this.assertLeadMutable(lead);

      const orgId = this.getOrgId(authenticatedUser);
      const resolvedFiles: Array<{
        file: UploadFile;
        documentType: LeadDocumentType;
        pageSide: LeadDocumentPageSide;
      }> = [];

      this.pushLeadDocument(
        resolvedFiles,
        files.aadhaarFront?.[0],
        'aadhaar',
        pageMode === 'double' ? 'front' : 'single',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.aadhaarBack?.[0],
        'aadhaar',
        'back',
      );
      this.pushLeadDocument(
        resolvedFiles,
        files.rcFront?.[0],
        'rc',
        pageMode === 'double' ? 'front' : 'single',
      );
      this.pushLeadDocument(resolvedFiles, files.rcBack?.[0], 'rc', 'back');
      this.pushLeadDocument(resolvedFiles, files.pan?.[0], 'pan', 'single');
      this.pushLeadDocument(
        resolvedFiles,
        files.bankDetail?.[0],
        'bankDetail',
        'single',
      );

      if (pageMode === 'double') {
        if (files.aadhaarFront?.[0] && !files.aadhaarBack?.[0]) {
          throw new BadRequestException(
            'Aadhaar back page is required for double-page upload',
          );
        }
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
        resolvedFiles.map(async ({ file, documentType, pageSide }) => {
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
    const assignedUserId =
      authenticatedUser.role === Role.STAFF ? authenticatedUser.userId : undefined;
    return this.leadRepository.findLookupCandidates(
      orgId,
      query.q,
      assignedUserId,
    );
  }

  async getLeadLookupById(id: string, authenticatedUser: AuthenticatedUser) {
    const lead = await this.getLeadById(id, authenticatedUser);
    if (lead.status === LeadStatus.CLOSED || lead.invoiceId) {
      throw new BadRequestException('Lead is no longer available for invoicing');
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

    if (lead.status === LeadStatus.CLOSED) {
      throw new BadRequestException('Closed leads cannot be linked to invoices');
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
      ...(lead.status === LeadStatus.OPEN
        ? { status: LeadStatus.IN_PROCESS }
        : {}),
    });
  }

  async closeLeadForInvoice(
    leadId: string,
    invoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const lead = await this.requireLead(leadId);
    const orgId = this.getOrgId(authenticatedUser);
    if (lead.organizationId?.toString() !== orgId) {
      throw new ForbiddenException('Lead does not belong to organization');
    }

    await this.leadRepository.updateById(lead._id.toString(), {
      status: LeadStatus.CLOSED,
      invoiceId: new Types.ObjectId(invoiceId),
      closedAt: new Date(),
      closedBy: new Types.ObjectId(authenticatedUser.userId),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async getRequiredDocumentSummary(
    leadId: string,
    orgId: string,
  ): Promise<LeadDocumentRecordDocument[]> {
    return this.leadDocumentRepository.findByLeadAndOrg(leadId, orgId);
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

    const assignedTo = this.extractObjectIdString(lead.assignedTo);
    if (authenticatedUser.role === Role.STAFF && assignedTo === authenticatedUser.userId) {
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

  private normalizeLeadData<T extends Partial<CreateLeadDto | UpdateLeadDto>>(data: T) {
    if (data.last5ChassisNumber) {
      data.last5ChassisNumber = data.last5ChassisNumber.toUpperCase();
    }
    if (data.registrationNumber) {
      data.registrationNumber = data.registrationNumber.toUpperCase();
    }
    if (data.mobileNumber) {
      data.mobileNumber = data.mobileNumber.replace(/\s+/g, '');
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
      pageSide: LeadDocumentPageSide;
    }>,
    file: UploadFile | undefined,
    documentType: LeadDocumentType,
    pageSide: LeadDocumentPageSide,
  ) {
    if (file) {
      files.push({ file, documentType, pageSide });
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
