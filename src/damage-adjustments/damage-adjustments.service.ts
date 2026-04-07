import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import type { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { Role } from 'src/common/enum/role.enum';
import { InventoryRepository } from 'src/inventory/inventory.repository';
import type { InventoryDocument } from 'src/inventory/inventory.schema';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { DamageAdjustmentRepository } from './damage-adjustment.repository';
import type { CreateDamageAdjustmentDto } from './dto/create-damage-adjustment.dto';
import type { QueryDamageAdjustmentsDto } from './dto/query-damage-adjustments.dto';

type DamageAdjustmentLike = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  partId: Types.ObjectId | string | null;
  partName?: string | null;
  previousCondition: Condition;
  newCondition: Condition;
  quantityAffected: number;
  reason: string;
  recordedBy: Types.ObjectId;
};

@Injectable()
export class DamageAdjustmentsService {
  constructor(
    private readonly damageAdjustmentRepo: DamageAdjustmentRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly invoiceRepo: InvoiceRepository,
  ) {}

  async create(
    createDto: CreateDamageAdjustmentDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const sanitized = sanitizeObject(createDto) as CreateDamageAdjustmentDto;
    const inventoryId = validateObjectId(sanitized.partId, 'Inventory ID');
    const quantityAffected = sanitized.quantityAffected;

    const inventory = await this.inventoryRepo.findById(inventoryId);
    if (!inventory) {
      throw new NotFoundException('Inventory part not found');
    }
    const invoice = await this.invoiceRepo.findById(inventory.invoiceId.toString());
    if (!invoice) {
      throw new NotFoundException('Invoice not found for inventory part');
    }
    if (invoice.organizationId?.toString() !== orgId) {
      throw new BadRequestException(
        'Inventory part does not belong to organization',
      );
    }

    const previousCondition = inventory.condition;
    const newCondition = sanitized.newCondition;

    if (previousCondition === newCondition) {
      throw new BadRequestException('New condition must be different from current condition');
    }

    if (
      previousCondition === Condition.DAMAGED &&
      newCondition === Condition.GOOD &&
      authenticatedUser.role !== Role.ADMIN
    ) {
      throw new BadRequestException(
        'Only admin can change condition from DAMAGED to GOOD',
      );
    }

    if (quantityAffected <= 0 || !Number.isFinite(quantityAffected)) {
      throw new BadRequestException('quantityAffected must be a positive number');
    }
    if (quantityAffected > inventory.availableQuantity) {
      throw new BadRequestException(
        'Damage adjustment cannot exceed available quantity',
      );
    }

    if (previousCondition === Condition.GOOD && newCondition === Condition.DAMAGED) {
      await this.applyGoodToDamagedAdjustment(
        inventoryId,
        inventory,
        quantityAffected,
        sanitized.reason,
        authenticatedUser.userId,
      );
    } else if (
      previousCondition === Condition.DAMAGED &&
      newCondition === Condition.GOOD
    ) {
      await this.applyDamagedToGoodAdjustment(
        inventoryId,
        inventory,
        quantityAffected,
        authenticatedUser.userId,
      );
    } else {
      throw new BadRequestException(
        'Only GOOD to DAMAGED or DAMAGED to GOOD transitions are supported',
      );
    }

    return this.damageAdjustmentRepo.create({
      organizationId: new Types.ObjectId(orgId),
      partId: new Types.ObjectId(inventoryId),
      previousCondition,
      newCondition,
      quantityAffected,
      reason: sanitized.reason,
      recordedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async findAll(
    query: QueryDamageAdjustmentsDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<DamageAdjustmentLike>> {
    const orgId = this.getOrgId(authenticatedUser);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(orgId),
    };
    if (query.partId) {
      filter.partId = new Types.ObjectId(validateObjectId(query.partId, 'Inventory ID'));
    }

    const { page, limit } = getPagination(query.page, query.limit);
    const { data, total } = await this.damageAdjustmentRepo.findPaginatedWithPartNames(
      filter,
      page,
      limit,
    );
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as DamageAdjustmentLike[],
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private async applyGoodToDamagedAdjustment(
    inventoryId: string,
    inventory: InventoryDocument,
    quantityAffected: number,
    reason: string,
    userId: string,
  ) {
    const nextOpeningStock = inventory.openingStock - quantityAffected;
    const nextAvailable = inventory.availableQuantity - quantityAffected;

    if (nextOpeningStock < 0 || nextAvailable < 0) {
      throw new BadRequestException('Adjustment would make stock negative');
    }

    const nextStatus =
      nextAvailable <= 0 ? Status.SOLD_OUT : inventory.quantityIssued > 0
        ? Status.PARTIAL_SOLD
        : Status.AVAILABLE;

    await this.inventoryRepo.updateById(inventoryId, {
      openingStock: nextOpeningStock,
      availableQuantity: nextAvailable,
      status: nextStatus,
    });

    await this.inventoryRepo.create({
      invoiceId: inventory.invoiceId,
      vechileId: inventory.vechileId,
      purchaseInvoiceNumber: inventory.purchaseInvoiceNumber,
      vechileModel: inventory.vechileModel,
      partName: inventory.partName,
      partType: inventory.partType,
      openingStock: quantityAffected,
      quantityReceived: 0,
      quantityIssued: 0,
      availableQuantity: quantityAffected,
      condition: Condition.DAMAGED,
      status: Status.DAMAGE_ONLY,
      unitPrice: inventory.unitPrice,
      documents: inventory.documents ?? [],
      createdBy: new Types.ObjectId(userId),
      damageReason: reason,
      damageRecordedAt: new Date(),
      damageRecordedBy: new Types.ObjectId(userId),
    });
  }

  private async applyDamagedToGoodAdjustment(
    inventoryId: string,
    inventory: InventoryDocument,
    quantityAffected: number,
    userId: string,
  ) {
    const nextOpeningStock = inventory.openingStock - quantityAffected;
    const nextAvailable = inventory.availableQuantity - quantityAffected;

    if (nextOpeningStock < 0 || nextAvailable < 0) {
      throw new BadRequestException('Adjustment would make stock negative');
    }

    // For DAMAGED inventory rows, we always keep the status as DAMAGE_ONLY.
    const nextStatus = Status.DAMAGE_ONLY;

    await this.inventoryRepo.updateById(inventoryId, {
      openingStock: nextOpeningStock,
      availableQuantity: nextAvailable,
      status: nextStatus,
    });

    await this.inventoryRepo.create({
      invoiceId: inventory.invoiceId,
      vechileId: inventory.vechileId,
      purchaseInvoiceNumber: inventory.purchaseInvoiceNumber,
      vechileModel: inventory.vechileModel,
      partName: inventory.partName,
      partType: inventory.partType,
      openingStock: quantityAffected,
      quantityReceived: 0,
      quantityIssued: 0,
      availableQuantity: quantityAffected,
      condition: Condition.GOOD,
      status: Status.AVAILABLE,
      unitPrice: inventory.unitPrice,
      documents: inventory.documents ?? [],
      createdBy: new Types.ObjectId(userId),
    });
  }

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }
}

