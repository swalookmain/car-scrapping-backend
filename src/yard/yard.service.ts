import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { LoggerService } from '@nestjs/common';
import { Types } from 'mongoose';
import { YardVehicleRepository } from './yard-vehicle.repository';
import { YardMovementRepository } from './yard-movement.repository';
import { YardZoneRepository } from './yard-zone.repository';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { VehicleInvoiceRepository } from 'src/invoice/vehicle-invoice.repository';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { getPagination } from 'src/common/utils/pagination.util';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';
import { YardSourceType } from 'src/common/enum/yardSourceType.enum';
import { VechicleStatus } from 'src/common/enum/vechicleStatus.enum';
import { AuditAction } from 'src/common/enum/audit.enum';
import { QueryYardVehicleDto } from './dto/query-yard-vehicle.dto';
import { UpdateYardVehicleStatusDto } from './dto/update-yard-vehicle-status.dto';
import { CreateYardZoneDto } from './dto/create-yard-zone.dto';
const DEFAULT_ZONES = [
  { name: 'Receiving', code: 'RECEIVING' },
  { name: 'Parking A', code: 'PARKING_A' },
  { name: 'Dismantling Bay', code: 'DISMANTLING_BAY' },
  { name: 'Exit', code: 'EXIT' },
];

@Injectable()
export class YardService {
  constructor(
    private readonly yardVehicleRepository: YardVehicleRepository,
    private readonly yardMovementRepository: YardMovementRepository,
    private readonly yardZoneRepository: YardZoneRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly vehicleInvoiceRepository: VehicleInvoiceRepository,
    private readonly auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return user.orgId;
  }

  private getUserId(user: AuthenticatedUser): Types.ObjectId {
    return new Types.ObjectId(validateObjectId(user.userId, 'User ID'));
  }

  private resolveSourceType(invoice: {
    leadId?: Types.ObjectId;
    auctionId?: Types.ObjectId;
  }): YardSourceType {
    if (invoice.auctionId) return YardSourceType.AUCTION;
    if (invoice.leadId) return YardSourceType.LEAD;
    return YardSourceType.DIRECT;
  }

  async ensureDefaultZones(orgId: string, userId: Types.ObjectId) {
    const existing = await this.yardZoneRepository.findAllByFilter({
      organizationId: new Types.ObjectId(orgId),
    });
    if (existing.length > 0) return;

    for (const zone of DEFAULT_ZONES) {
      await this.yardZoneRepository.create({
        organizationId: new Types.ObjectId(orgId),
        name: zone.name,
        code: zone.code,
        isActive: true,
        createdBy: userId,
      });
    }
  }

  async ensureYardEntriesForInvoice(
    invoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    const validInvoiceId = validateObjectId(invoiceId, 'Invoice ID');

    const invoice = await this.invoiceRepository.findById(validInvoiceId);
    if (!invoice) return;

    await this.ensureDefaultZones(orgId, userId);

    const vehicles = await this.vehicleInvoiceRepository.findAllByFilter({
      invoiceId: new Types.ObjectId(validInvoiceId),
      isDeleted: { $ne: true },
    });

    const sourceType = this.resolveSourceType(invoice);

    for (const vehicle of vehicles) {
      const vehicleInvoiceId = vehicle._id.toString();
      const exists = await this.yardVehicleRepository.findByVehicleInvoiceId(
        vehicleInvoiceId,
      );
      if (exists) continue;

      await this.yardVehicleRepository.create({
        organizationId: new Types.ObjectId(orgId),
        vehicleInvoiceId: vehicle._id,
        invoiceId: new Types.ObjectId(validInvoiceId),
        registrationNumber: vehicle.registration_number,
        make: vehicle.make,
        modelName: vehicle.model_name,
        leadId: invoice.leadId,
        auctionId: invoice.auctionId,
        auctionVehicleId: (vehicle as { auctionVehicleId?: Types.ObjectId })
          .auctionVehicleId,
        sourceType,
        currentStatus: YardVehicleStatus.AWAITING_ARRIVAL,
        createdBy: userId,
      });

      const created = await this.yardVehicleRepository.findByVehicleInvoiceId(
        vehicleInvoiceId,
      );
      if (created) {
        await this.recordMovement({
          orgId,
          yardVehicleId: created._id,
          fromStatus: undefined,
          toStatus: YardVehicleStatus.AWAITING_ARRIVAL,
          performedBy: userId,
          source: 'INVOICE_CONFIRMED',
          notes: 'Auto-created on purchase invoice confirmation',
        });
      }
    }
  }

  async backfillForInvoice(
    invoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    await this.ensureYardEntriesForInvoice(invoiceId, authenticatedUser);
    return { message: 'Yard entries ensured for invoice vehicles' };
  }

  private assertTransition(
    from: YardVehicleStatus,
    to: YardVehicleStatus,
    options?: { viaStartDismantling?: boolean; viaCompleteDismantling?: boolean },
  ) {
    if (options?.viaStartDismantling) {
      if (from !== YardVehicleStatus.PARKED || to !== YardVehicleStatus.DISMANTLING_IN_PROGRESS) {
        throw new BadRequestException(
          'Dismantling can only be started for parked vehicles',
        );
      }
      return;
    }

    if (options?.viaCompleteDismantling) {
      if (
        from !== YardVehicleStatus.DISMANTLING_IN_PROGRESS ||
        to !== YardVehicleStatus.DISMANTLED
      ) {
        throw new BadRequestException(
          'Dismantling can only be completed from in-progress status',
        );
      }
      return;
    }

    const allowed: Partial<Record<YardVehicleStatus, YardVehicleStatus[]>> = {
      [YardVehicleStatus.AWAITING_ARRIVAL]: [
        YardVehicleStatus.GATE_IN,
        YardVehicleStatus.PARKED,
      ],
      [YardVehicleStatus.GATE_IN]: [YardVehicleStatus.PARKED],
      [YardVehicleStatus.PARKED]: [YardVehicleStatus.EXITED],
      [YardVehicleStatus.DISMANTLED]: [YardVehicleStatus.EXITED],
    };

    const next = allowed[from] ?? [];
    if (!next.includes(to)) {
      throw new BadRequestException(
        `Cannot transition yard status from ${from} to ${to}`,
      );
    }
  }

  private async recordMovement(params: {
    orgId: string;
    yardVehicleId: Types.ObjectId;
    fromStatus?: YardVehicleStatus;
    toStatus: YardVehicleStatus;
    fromZoneId?: Types.ObjectId;
    toZoneId?: Types.ObjectId;
    fromSlot?: string;
    toSlot?: string;
    notes?: string;
    reason?: string;
    source?: string;
    performedBy: Types.ObjectId;
  }) {
    await this.yardMovementRepository.create({
      organizationId: new Types.ObjectId(params.orgId),
      yardVehicleId: params.yardVehicleId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      fromZoneId: params.fromZoneId,
      toZoneId: params.toZoneId,
      fromSlot: params.fromSlot,
      toSlot: params.toSlot,
      notes: params.notes,
      reason: params.reason,
      source: params.source,
      performedBy: params.performedBy,
    });
  }

  private async logAudit(
    user: AuthenticatedUser,
    action: AuditAction,
    resourceId: string,
    payload?: Record<string, unknown>,
  ) {
    try {
      await this.auditLogService.create(
        {
          actorId: this.getUserId(user),
          actorName: user.name,
          actorRole: user.role,
          organizationId: new Types.ObjectId(this.getOrgId(user)),
          action,
          resource: 'yard_vehicle',
          resourceId: new Types.ObjectId(resourceId),
          status: 'SUCCESS',
          payload,
        },
        user.role,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Yard audit log failed: ${msg}`, 'YardService');
    }
  }

  private async getYardVehicleForOrg(id: string, orgId: string) {
    const yardVehicle = await this.yardVehicleRepository.findById(id, [
      { path: 'currentZoneId', select: 'name code' },
      { path: 'invoiceId', select: 'invoiceNumber sellerName' },
    ]);
    if (!yardVehicle) {
      throw new NotFoundException('Yard vehicle not found');
    }
    if (yardVehicle.organizationId?.toString() !== orgId) {
      throw new BadRequestException('Yard vehicle does not belong to organization');
    }
    return yardVehicle;
  }

  async findAll(
    query: QueryYardVehicleDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<unknown>> {
    const orgId = this.getOrgId(authenticatedUser);
    const { page, limit } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(orgId),
    };
    if (query.status) filter.currentStatus = query.status;
    if (query.invoiceId) {
      filter.invoiceId = new Types.ObjectId(
        validateObjectId(query.invoiceId, 'Invoice ID'),
      );
    }
    if (query.zoneId) {
      filter.currentZoneId = new Types.ObjectId(
        validateObjectId(query.zoneId, 'Zone ID'),
      );
    }
    if (query.registrationNumber?.trim()) {
      filter.registrationNumber = {
        $regex: query.registrationNumber.trim(),
        $options: 'i',
      };
    }

    const { data, total } = await this.yardVehicleRepository.findPaginated(
      filter,
      page,
      limit,
      { createdAt: -1 },
      [{ path: 'currentZoneId', select: 'name code' }],
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    return this.getYardVehicleForOrg(validateObjectId(id, 'Yard vehicle ID'), orgId);
  }

  async findByVehicleInvoiceId(
    vehicleInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validId = validateObjectId(vehicleInvoiceId, 'Vehicle invoice ID');
    const yardVehicle = await this.yardVehicleRepository.findByVehicleInvoiceId(
      validId,
    );
    if (!yardVehicle) {
      return null;
    }
    if (yardVehicle.organizationId?.toString() !== orgId) {
      throw new BadRequestException('Yard vehicle does not belong to organization');
    }
    return this.yardVehicleRepository.findById(yardVehicle._id.toString(), [
      { path: 'currentZoneId', select: 'name code' },
    ]);
  }

  async getMovements(yardVehicleId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const yardVehicle = await this.getYardVehicleForOrg(
      validateObjectId(yardVehicleId, 'Yard vehicle ID'),
      orgId,
    );
    return this.yardMovementRepository.findByYardVehicleId(
      yardVehicle._id.toString(),
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateYardVehicleStatusDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    const sanitized = sanitizeObject(dto) as UpdateYardVehicleStatusDto;
    const yardVehicle = await this.getYardVehicleForOrg(
      validateObjectId(id, 'Yard vehicle ID'),
      orgId,
    );

    const fromStatus = yardVehicle.currentStatus;
    const toStatus = sanitized.status;

    if (fromStatus === toStatus && !sanitized.zoneId && !sanitized.slot) {
      return yardVehicle;
    }

    this.assertTransition(fromStatus, toStatus);

    if (toStatus === YardVehicleStatus.PARKED && !sanitized.zoneId) {
      throw new BadRequestException('Zone is required when parking a vehicle');
    }

    const updateData: Record<string, unknown> = {
      currentStatus: toStatus,
      updatedBy: userId,
    };

    let toZoneId: Types.ObjectId | undefined;
    if (sanitized.zoneId) {
      toZoneId = new Types.ObjectId(validateObjectId(sanitized.zoneId, 'Zone ID'));
      const zone = await this.yardZoneRepository.findById(sanitized.zoneId);
      if (!zone || zone.organizationId?.toString() !== orgId) {
        throw new BadRequestException('Invalid yard zone');
      }
      updateData.currentZoneId = toZoneId;
    }
    if (sanitized.slot !== undefined) {
      updateData.currentSlot = sanitized.slot?.trim() || undefined;
    }

    const now = new Date();
    if (toStatus === YardVehicleStatus.GATE_IN) updateData.gateInAt = now;
    if (toStatus === YardVehicleStatus.PARKED) updateData.parkedAt = now;
    if (toStatus === YardVehicleStatus.EXITED) updateData.exitedAt = now;

    const updated = await this.yardVehicleRepository.updateById(
      yardVehicle._id.toString(),
      updateData,
    );

    await this.recordMovement({
      orgId,
      yardVehicleId: yardVehicle._id,
      fromStatus,
      toStatus,
      fromZoneId: yardVehicle.currentZoneId as Types.ObjectId | undefined,
      toZoneId,
      fromSlot: yardVehicle.currentSlot,
      toSlot: sanitized.slot,
      notes: sanitized.notes,
      source: 'YARD_UI',
      performedBy: userId,
    });

    await this.logAudit(authenticatedUser, AuditAction.YARD_STATUS_UPDATE, id, {
      fromStatus,
      toStatus,
    });

    return updated;
  }

  async startDismantling(
    vehicleInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    const validVehicleInvoiceId = validateObjectId(
      vehicleInvoiceId,
      'Vehicle invoice ID',
    );

    const yardVehicle = await this.yardVehicleRepository.findByVehicleInvoiceId(
      validVehicleInvoiceId,
    );
    if (!yardVehicle) {
      throw new NotFoundException(
        'No yard record for this vehicle. Confirm invoice or run yard backfill.',
      );
    }
    if (yardVehicle.organizationId?.toString() !== orgId) {
      throw new BadRequestException('Yard vehicle does not belong to organization');
    }

    const fromStatus = yardVehicle.currentStatus;
    const toStatus = YardVehicleStatus.DISMANTLING_IN_PROGRESS;
    this.assertTransition(fromStatus, toStatus, { viaStartDismantling: true });

    const now = new Date();
    const updated = await this.yardVehicleRepository.updateById(
      yardVehicle._id.toString(),
      {
        currentStatus: toStatus,
        dismantlingStartedAt: now,
        updatedBy: userId,
      },
    );

    await this.vehicleInvoiceRepository.updateById(validVehicleInvoiceId, {
      vechicleStatus: VechicleStatus.DISMANTLING_IN_PROGRESS,
    });

    await this.recordMovement({
      orgId,
      yardVehicleId: yardVehicle._id,
      fromStatus,
      toStatus,
      fromZoneId: yardVehicle.currentZoneId as Types.ObjectId | undefined,
      toZoneId: yardVehicle.currentZoneId as Types.ObjectId | undefined,
      fromSlot: yardVehicle.currentSlot,
      toSlot: yardVehicle.currentSlot,
      source: 'DISMANTLE_START',
      performedBy: userId,
    });

    await this.logAudit(
      authenticatedUser,
      AuditAction.YARD_DISMANTLING_START,
      yardVehicle._id.toString(),
    );

    return updated;
  }

  async assertCanCreateInventory(vehicleInvoiceId: string) {
    const yardVehicle =
      await this.yardVehicleRepository.findByVehicleInvoiceId(vehicleInvoiceId);
    if (!yardVehicle) return;

    if (yardVehicle.currentStatus !== YardVehicleStatus.DISMANTLING_IN_PROGRESS) {
      throw new BadRequestException(
        'Vehicle must be in dismantling progress. Start dismantling from Yard or Inventory first.',
      );
    }
  }

  async completeDismantling(
    vehicleInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    const validVehicleInvoiceId = validateObjectId(
      vehicleInvoiceId,
      'Vehicle invoice ID',
    );

    const yardVehicle = await this.yardVehicleRepository.findByVehicleInvoiceId(
      validVehicleInvoiceId,
    );
    if (!yardVehicle) return;

    if (yardVehicle.organizationId?.toString() !== orgId) {
      throw new BadRequestException('Yard vehicle does not belong to organization');
    }

    const fromStatus = yardVehicle.currentStatus;
    const toStatus = YardVehicleStatus.DISMANTLED;

    if (fromStatus === YardVehicleStatus.DISMANTLED) return;

    this.assertTransition(fromStatus, toStatus, { viaCompleteDismantling: true });

    const now = new Date();
    await this.yardVehicleRepository.updateById(yardVehicle._id.toString(), {
      currentStatus: toStatus,
      dismantledAt: now,
      updatedBy: userId,
    });

    await this.vehicleInvoiceRepository.updateById(validVehicleInvoiceId, {
      vechicleStatus: VechicleStatus.DISMANTLED,
    });

    await this.recordMovement({
      orgId,
      yardVehicleId: yardVehicle._id,
      fromStatus,
      toStatus,
      source: 'INVENTORY_COMPLETE',
      performedBy: userId,
    });

    await this.logAudit(
      authenticatedUser,
      AuditAction.YARD_DISMANTLING_COMPLETE,
      yardVehicle._id.toString(),
    );
  }

  async getDashboardSummary(authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const statuses = Object.values(YardVehicleStatus);
    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.yardVehicleRepository.countByStatus(orgId, status),
      })),
    );
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    return { total, byStatus: counts };
  }

  async getZones(authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    await this.ensureDefaultZones(orgId, userId);
    return this.yardZoneRepository.findAllByFilter({
      organizationId: new Types.ObjectId(orgId),
      isActive: true,
    });
  }

  async createZone(
    dto: CreateYardZoneDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const userId = this.getUserId(authenticatedUser);
    const sanitized = sanitizeObject(dto) as CreateYardZoneDto;
    return this.yardZoneRepository.create({
      organizationId: new Types.ObjectId(orgId),
      name: sanitized.name.trim(),
      code: sanitized.code.trim().toUpperCase(),
      isActive: true,
      createdBy: userId,
    });
  }
}
