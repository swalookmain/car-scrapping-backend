import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { LoggerService } from '@nestjs/common';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { VechicleStatus } from 'src/common/enum/vechicleStatus.enum';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateVehicleCodRecordDto } from './dto/create-vehicle-cod-record.dto';
import { UpdateVehicleCodTrackingDto } from './dto/update-vehicle-cod-tracking.dto';
import { VehicleComplianceRepository } from './vehicle-compliance.repository';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { VehicleInvoiceRepository } from 'src/invoice/vehicle-invoice.repository';
import { QueryVehicleCodRecordDto } from './dto/query-vehicle-cod-record.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { AuditAction } from 'src/common/enum/audit.enum';
import { Role } from 'src/common/enum/role.enum';

type VehicleComplianceRepoPort = {
  create: (
    vehicleCodData: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  findById: (id: string) => Promise<{
    organizationId?: { toString(): string };
    codGenerated?: boolean;
    codDocumentUrl?: string | null;
    codGeneratedAt?: Date | null;
    cvsGenerated?: boolean;
    cvsDocumentUrl?: string | null;
    cvsGeneratedAt?: Date | null;
  } | null>;
  getVehicleCodRecordByVehicleId: (vehicleId: string) => Promise<{
    organizationId?: { toString(): string };
    codGenerated?: boolean;
  } | null>;
  updateById: (
    id: string,
    updateData: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>;
  hasGeneratedCodForVehicle: (vehicleId: string) => Promise<unknown>;
  findPaginated: (
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ) => Promise<{ data: Array<Record<string, unknown>>; total: number }>;
};

@Injectable()
export class VehicleComplianceService {
  constructor(
    @Inject(VehicleComplianceRepository)
    private readonly vehicleComplianceRepository: VehicleComplianceRepoPort,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly vehicleInvoiceRepository: VehicleInvoiceRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createVehicleCodRecord(
    createVehicleCodRecordDto: CreateVehicleCodRecordDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const sanitizedData = sanitizeObject(
        createVehicleCodRecordDto,
      ) as CreateVehicleCodRecordDto;
      const vehicleId = validateObjectId(sanitizedData.vehicleId, 'Vehicle ID');
      const invoiceId = validateObjectId(sanitizedData.invoiceId, 'Invoice ID');
      const orgId = this.getOrgId(authenticatedUser);
      await this.organizationsService.getById(orgId);

      const [invoiceRaw, vehicleRaw] = await Promise.all([
        this.invoiceRepository.findById(invoiceId),
        this.vehicleInvoiceRepository.findById(vehicleId),
      ]);
      const invoice = invoiceRaw as
        | { organizationId?: { toString(): string } }
        | null;
      const vehicle = vehicleRaw as
        | {
            organizationId?: { toString(): string };
            invoiceId?: { toString(): string };
            vechicleStatus?: VechicleStatus;
          }
        | null;

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }
      if (invoice.organizationId?.toString() !== orgId) {
        throw new BadRequestException('Invoice does not belong to organization');
      }
      if (vehicle.organizationId?.toString() !== orgId) {
        throw new BadRequestException('Vehicle does not belong to organization');
      }
      if (vehicle.invoiceId?.toString() !== invoiceId) {
        throw new BadRequestException('Vehicle does not belong to invoice');
      }

      const existingCod =
        await this.vehicleComplianceRepository.getVehicleCodRecordByVehicleId(
          vehicleId,
        );
      if (existingCod) {
        throw new BadRequestException('Compliance record already exists for this vehicle');
      }

      if (sanitizedData.codGenerated) {
        if (!sanitizedData.codInwardNumber) {
          throw new BadRequestException(
            'COD inward number is required when COD is generated',
          );
        }
        if (!sanitizedData.codIssueDate) {
          throw new BadRequestException(
            'COD issue date is required when COD is generated',
          );
        }
      }
      if (
        !sanitizedData.codGenerated &&
        (sanitizedData.codInwardNumber || sanitizedData.codIssueDate)
      ) {
        throw new BadRequestException(
          'COD inward number and issue date are allowed only when COD is generated',
        );
      }

      const codGeneratedAt =
        sanitizedData.codGenerated === true ? new Date() : undefined;
      const cvsGenerated = sanitizedData.cvsGenerated === true;
      const cvsGeneratedAt =
        sanitizedData.cvsGenerated === true ? new Date() : undefined;

      return this.vehicleComplianceRepository.create({
        organizationId: new Types.ObjectId(orgId),
        vehicleId: new Types.ObjectId(vehicleId),
        invoiceId: new Types.ObjectId(invoiceId),
        codGenerated: sanitizedData.codGenerated,
        codGeneratedAt,
        codDocumentUrl: sanitizedData.codDocumentUrl,
        codInwardNumber: sanitizedData.codInwardNumber,
        codIssueDate: sanitizedData.codIssueDate
          ? new Date(sanitizedData.codIssueDate)
          : undefined,
        cvsGenerated,
        cvsGeneratedAt,
        cvsDocumentUrl: sanitizedData.cvsDocumentUrl,
        rtoOffice: sanitizedData.rtoOffice,
        rtoStatus: sanitizedData.rtoStatus,
        remarks: sanitizedData.remarks,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'VehicleComplianceService');
      throw new BadRequestException('Failed to create vehicle COD record');
    }
  }

  async updateVehicleCodTracking(
    codRecordId: string,
    updateVehicleCodTrackingDto: UpdateVehicleCodTrackingDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const sanitizedData = sanitizeObject(
        updateVehicleCodTrackingDto,
      ) as UpdateVehicleCodTrackingDto;
      const validatedCodRecordId = validateObjectId(codRecordId, 'COD record ID');
      const orgId = this.getOrgId(authenticatedUser);
      const actorId = authenticatedUser.userId;
      const codRecord = await this.vehicleComplianceRepository.findById(
        validatedCodRecordId,
      );
      if (!codRecord) {
        throw new NotFoundException('Vehicle COD record not found');
      }
      if (codRecord.organizationId?.toString() !== orgId) {
        throw new BadRequestException(
          'Vehicle COD record does not belong to organization',
        );
      }

      const previous = {
        codGenerated: codRecord.codGenerated,
        codDocumentUrl: codRecord.codDocumentUrl ?? null,
        codGeneratedAt: codRecord.codGeneratedAt
          ? codRecord.codGeneratedAt.toISOString()
          : null,
        cvsGenerated: codRecord.cvsGenerated,
        cvsDocumentUrl: codRecord.cvsDocumentUrl ?? null,
        cvsGeneratedAt: codRecord.cvsGeneratedAt
          ? codRecord.cvsGeneratedAt.toISOString()
          : null,
      };

      const updatePayload: Record<string, unknown> = {
        rtoOffice: sanitizedData.rtoOffice,
        rtoStatus: sanitizedData.rtoStatus,
        remarks: sanitizedData.remarks,
      };
      if (sanitizedData.codGenerated !== undefined) {
        updatePayload.codGenerated = sanitizedData.codGenerated;
        updatePayload.codGeneratedAt =
          sanitizedData.codGenerated === true
            ? sanitizedData.codGeneratedAt
              ? new Date(sanitizedData.codGeneratedAt)
              : new Date()
            : undefined;
      }
      if (sanitizedData.codDocumentUrl !== undefined) {
        updatePayload.codDocumentUrl = sanitizedData.codDocumentUrl;
      }
      if (sanitizedData.codGeneratedAt !== undefined) {
        updatePayload.codGeneratedAt = new Date(sanitizedData.codGeneratedAt);
      }
      if (sanitizedData.cvsGenerated !== undefined) {
        updatePayload.cvsGenerated = sanitizedData.cvsGenerated;
        updatePayload.cvsGeneratedAt =
          sanitizedData.cvsGenerated === true
            ? sanitizedData.cvsGeneratedAt
              ? new Date(sanitizedData.cvsGeneratedAt)
              : new Date()
            : undefined;
      }
      if (sanitizedData.cvsDocumentUrl !== undefined) {
        updatePayload.cvsDocumentUrl = sanitizedData.cvsDocumentUrl;
      }
      if (sanitizedData.cvsGeneratedAt !== undefined) {
        updatePayload.cvsGeneratedAt = new Date(sanitizedData.cvsGeneratedAt);
      }

      const codChanged =
        sanitizedData.codGenerated !== undefined ||
        sanitizedData.codDocumentUrl !== undefined ||
        sanitizedData.codGeneratedAt !== undefined;
      const cvsChanged =
        sanitizedData.cvsGenerated !== undefined ||
        sanitizedData.cvsDocumentUrl !== undefined ||
        sanitizedData.cvsGeneratedAt !== undefined;

      const codGeneratedAtVal = updatePayload.codGeneratedAt;
      const newCod = codChanged
        ? {
            codGenerated: updatePayload.codGenerated ?? previous.codGenerated,
            codDocumentUrl:
              updatePayload.codDocumentUrl ?? previous.codDocumentUrl,
            codGeneratedAt:
              codGeneratedAtVal instanceof Date
                ? codGeneratedAtVal.toISOString()
                : previous.codGeneratedAt,
          }
        : previous;
      const cvsGeneratedAtVal = updatePayload.cvsGeneratedAt;
      const newCvs = cvsChanged
        ? {
            cvsGenerated: updatePayload.cvsGenerated ?? previous.cvsGenerated,
            cvsDocumentUrl:
              updatePayload.cvsDocumentUrl ?? previous.cvsDocumentUrl,
            cvsGeneratedAt:
              cvsGeneratedAtVal instanceof Date
                ? cvsGeneratedAtVal.toISOString()
                : previous.cvsGeneratedAt,
          }
        : previous;

      const actorRole: Role = authenticatedUser.role;
      if (codChanged) {
        await this.auditLogService.create(
          {
            actorId: new Types.ObjectId(actorId),
            actorRole,
            organizationId: new Types.ObjectId(orgId),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- CreateAuditLogDto action enum
            action: AuditAction.UPDATE_COD_STATUS,
            resource: 'vehicle_cod_record',
            resourceId: new Types.ObjectId(validatedCodRecordId),
            status: 'SUCCESS',
            payload: {
              previous: {
                codGenerated: previous.codGenerated,
                codDocumentUrl: previous.codDocumentUrl,
                codGeneratedAt: previous.codGeneratedAt,
              },
              new: newCod,
              updatedBy: actorId,
              timestamp: new Date().toISOString(),
            } as Record<string, unknown>,
          },
          actorRole,
        );
      }
      if (cvsChanged) {
        await this.auditLogService.create(
          {
            actorId: new Types.ObjectId(actorId),
            actorRole,
            organizationId: new Types.ObjectId(orgId),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- CreateAuditLogDto action enum
            action: AuditAction.UPDATE_CVS_STATUS,
            resource: 'vehicle_cod_record',
            resourceId: new Types.ObjectId(validatedCodRecordId),
            status: 'SUCCESS',
            payload: {
              previous: {
                cvsGenerated: previous.cvsGenerated,
                cvsDocumentUrl: previous.cvsDocumentUrl,
                cvsGeneratedAt: previous.cvsGeneratedAt,
              },
              new: newCvs,
              updatedBy: actorId,
              timestamp: new Date().toISOString(),
            } as Record<string, unknown>,
          },
          actorRole,
        );
      }

      return this.vehicleComplianceRepository.updateById(
        validatedCodRecordId,
        updatePayload,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'VehicleComplianceService');
      throw new BadRequestException('Failed to update vehicle COD tracking');
    }
  }

  async getVehicleCodRecordByVehicleId(
    vehicleId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const orgId = this.getOrgId(authenticatedUser);
      const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
      const codRecord =
        await this.vehicleComplianceRepository.getVehicleCodRecordByVehicleId(
          validatedVehicleId,
        );
      if (!codRecord) {
        throw new NotFoundException('Vehicle COD record not found');
      }
      if (codRecord.organizationId?.toString() !== orgId) {
        throw new BadRequestException(
          'Vehicle COD record does not belong to organization',
        );
      }
      return codRecord;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'VehicleComplianceService');
      throw new BadRequestException('Failed to get vehicle COD record');
    }
  }

  async hasGeneratedCodForVehicle(vehicleId: string): Promise<boolean> {
    const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
    const codRecord = await this.vehicleComplianceRepository.hasGeneratedCodForVehicle(
      validatedVehicleId,
    );
    return Boolean(codRecord);
  }

  async getVehicleCodRecords(
    query: QueryVehicleCodRecordDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    try {
      const orgId = this.getOrgId(authenticatedUser);
      const filter: Record<string, unknown> = {
        organizationId: new Types.ObjectId(orgId),
      };

      if (query.invoiceId) {
        filter.invoiceId = new Types.ObjectId(
          validateObjectId(query.invoiceId, 'Invoice ID'),
        );
      }
      if (query.vehicleId) {
        filter.vehicleId = new Types.ObjectId(
          validateObjectId(query.vehicleId, 'Vehicle ID'),
        );
      }
      if (query.codGenerated !== undefined) {
        filter.codGenerated = query.codGenerated === 'true';
      }
      if (query.cvsGenerated !== undefined) {
        filter.cvsGenerated = query.cvsGenerated === 'true';
      }
      if (query.rtoStatus) {
        filter.rtoStatus = query.rtoStatus;
      }

      const { page: safePage, limit: safeLimit } = getPagination(
        query.page,
        query.limit,
      );
      const result = await this.vehicleComplianceRepository.findPaginated(
        filter,
        safePage,
        safeLimit,
      );
      const data = result.data;
      const total = result.total;
      const totalPages = Math.ceil(total / safeLimit);

      return {
        data,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'VehicleComplianceService');
      throw new BadRequestException('Failed to get vehicle COD records');
    }
  }

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }
}
