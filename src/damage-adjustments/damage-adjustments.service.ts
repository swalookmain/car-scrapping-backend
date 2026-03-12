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
import { DamageAdjustmentRepository } from './damage-adjustment.repository';
import type { CreateDamageAdjustmentDto } from './dto/create-damage-adjustment.dto';
import type { QueryDamageAdjustmentsDto } from './dto/query-damage-adjustments.dto';

type DamageAdjustmentLike = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  partId: Types.ObjectId;
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

    const previousCondition = inventory.condition as Condition;
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
        inventory as unknown as any,
        quantityAffected,
        sanitized.reason,
        orgId,
        authenticatedUser.userId,
      );
    } else if (
      previousCondition === Condition.DAMAGED &&
      newCondition === Condition.GOOD
    ) {
      await this.applyDamagedToGoodAdjustment(
        inventoryId,
        inventory as unknown as any,
        quantityAffected,
        sanitized.reason,
        orgId,
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
    const { data, total } = await this.damageAdjustmentRepo.findPaginated(
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
    inventory: any,
    quantityAffected: number,
    reason: string,
    orgId: string,
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
      invoiceId: inventory['invoiceId'] as Types.ObjectId,
      vechileId: inventory['vechileId'] as Types.ObjectId,
      purchaseInvoiceNumber: inventory['purchaseInvoiceNumber'] as string,
      vechileModel: inventory.vechileModel as string,
      partName: inventory.partName as string,
      partType: inventory.partType,
      openingStock: quantityAffected,
      quantityReceived: 0,
      quantityIssued: 0,
      availableQuantity: quantityAffected,
      condition: Condition.DAMAGED,
      status: Status.DAMAGE_ONLY,
      unitPrice: inventory.unitPrice as number | undefined,
      documents: inventory.documents,
      createdBy: new Types.ObjectId(userId),
      damageReason: reason,
      damageRecordedAt: new Date(),
      damageRecordedBy: new Types.ObjectId(userId),
    });
  }

  private async applyDamagedToGoodAdjustment(
    inventoryId: string,
    inventory: any,
    quantityAffected: number,
    reason: string,
    orgId: string,
    userId: string,
  ) {
    const nextOpeningStock = inventory.openingStock - quantityAffected;
    const nextAvailable = inventory.availableQuantity - quantityAffected;

    if (nextOpeningStock < 0 || nextAvailable < 0) {
      throw new BadRequestException('Adjustment would make stock negative');
    }

    const nextStatus =
      nextAvailable <= 0 ? Status.DAMAGE_ONLY : Status.DAMAGE_ONLY;

    await this.inventoryRepo.updateById(inventoryId, {
      openingStock: nextOpeningStock,
      availableQuantity: nextAvailable,
      status: nextStatus,
    });

    await this.inventoryRepo.create({
      invoiceId: inventory['invoiceId'] as Types.ObjectId,
      vechileId: inventory['vechileId'] as Types.ObjectId,
      purchaseInvoiceNumber: inventory['purchaseInvoiceNumber'] as string,
      vechileModel: inventory.vechileModel as string,
      partName: inventory.partName as string,
      partType: inventory.partType,
      openingStock: quantityAffected,
      quantityReceived: 0,
      quantityIssued: 0,
      availableQuantity: quantityAffected,
      condition: Condition.GOOD,
      status: Status.AVAILABLE,
      unitPrice: inventory.unitPrice as number | undefined,
      documents: inventory.documents,
      createdBy: new Types.ObjectId(userId),
      damageReason: reason,
      damageRecordedAt: new Date(),
      damageRecordedBy: new Types.ObjectId(userId),
    });
  }

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }
}

