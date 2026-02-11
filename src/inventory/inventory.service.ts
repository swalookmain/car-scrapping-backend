import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import {
  CreateInventoryBatchDto,
  CreateInventoryItemDto,
} from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryRepository } from './inventory.repository';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import type { Inventory } from './inventory.schema';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly invoiceRepo: InvoiceRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createBatch(
    createDto: CreateInventoryBatchDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const sanitizedData = sanitizeObject(createDto) as CreateInventoryBatchDto;
      const invoiceId = validateObjectId(sanitizedData.invoiceId, 'Invoice ID');
      const vechileId = validateObjectId(
        sanitizedData.vechileId,
        'Vehicle ID',
      );
      if (!Array.isArray(sanitizedData.parts) || sanitizedData.parts.length === 0) {
        throw new BadRequestException('At least one part is required');
      }

      const [invoice, vechileInvoice, existingParts] = await Promise.all([
        this.invoiceRepo.getInvoiceById(invoiceId),
        this.invoiceRepo.getVechileInvoiceById(vechileId),
        this.inventoryRepo.existsByVehicleId(vechileId),
      ]);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (!vechileInvoice) {
        throw new NotFoundException('Vehicle invoice not found');
      }
      if (vechileInvoice.invoiceId?.toString() !== invoiceId) {
        throw new BadRequestException('Vehicle does not belong to invoice');
      }
      if (existingParts) {
        throw new BadRequestException('Dismantling already completed');
      }

      const vechileModel =
        (vechileInvoice as unknown as { model_name?: string; model?: string })
          .model_name ??
        (vechileInvoice as unknown as { model?: string }).model ??
        'UNKNOWN';

      const parts = sanitizedData.parts ?? [];
      const records = parts.map((part) => {
        const openingStock = this.ensureNumber(part.openingStock, 'openingStock');
        const quantityReceived = this.ensureNumber(
          part.quantityReceived ?? 0,
          'quantityReceived',
        );
        const quantityIssued = this.ensureNumber(
          part.quantityIssued ?? 0,
          'quantityIssued',
        );

        if (quantityIssued > openingStock + quantityReceived) {
          throw new BadRequestException(
            `Quantity issued exceeds available for part ${part.partName}`,
          );
        }
        if (part.condition === Condition.DAMAGED && quantityIssued > 0) {
          throw new BadRequestException(
            `Damaged part cannot be issued: ${part.partName}`,
          );
        }

        const availableQuantity = this.calculateAvailableQuantity(
          openingStock,
          quantityReceived,
          quantityIssued,
        );
        const status = this.calculateStatus(
          part.condition,
          availableQuantity,
          quantityIssued,
        );

        return {
          invoiceId: new Types.ObjectId(invoiceId),
          vechileId: new Types.ObjectId(vechileId),
          purchaseInvoiceNumber: invoice.invoiceNumber,
          vechileModel,
          partName: part.partName,
          partType: part.partType,
          openingStock,
          quantityReceived,
          quantityIssued,
          availableQuantity,
          condition: part.condition,
          status,
          unitPrice: part.unitPrice,
          documents: this.normalizeDocuments(part.documents, authenticatedUser),
          createdBy: new Types.ObjectId(authenticatedUser.userId),
        };
      });

      return this.inventoryRepo.createMany(records);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'InventoryService');
      throw new BadRequestException('Failed to create inventory');
    }
  }

  async findAll(
    filters: {
      invoiceId?: string;
      vechileId?: string;
      status?: Status;
      condition?: Condition;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResponse<Inventory> | Inventory[]> {
    const filter: Record<string, unknown> = {};
    if (filters.invoiceId) {
      filter.invoiceId = validateObjectId(filters.invoiceId, 'Invoice ID');
    }
    if (filters.vechileId) {
      filter.vechileId = validateObjectId(filters.vechileId, 'Vehicle ID');
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.condition) {
      filter.condition = filters.condition;
    }

    if (filters.page !== undefined && filters.limit !== undefined) {
      const { page: safePage, limit: safeLimit } = getPagination(
        filters.page,
        filters.limit,
      );
      const { data, total } = await this.inventoryRepo.findPaginated(
        filter,
        safePage,
        safeLimit,
      );
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
    }

    return this.inventoryRepo.findPaginated(filter, 1, 100).then((res) => res.data);
  }

  async findOne(id: string) {
    const validatedId = validateObjectId(id, 'Inventory ID');
    const record = await this.inventoryRepo.findById(validatedId);
    if (!record) {
      throw new NotFoundException('Inventory not found');
    }
    return record;
  }

  async update(
    id: string,
    updateDto: UpdateInventoryDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const validatedId = validateObjectId(id, 'Inventory ID');
    const existing = await this.inventoryRepo.findById(validatedId);
    if (!existing) {
      throw new NotFoundException('Inventory not found');
    }

    const sanitizedData = sanitizeObject(updateDto) as UpdateInventoryDto;

    const nextOpeningStock =
      sanitizedData.openingStock ?? existing.openingStock;
    const nextQuantityReceived =
      sanitizedData.quantityReceived ?? existing.quantityReceived;
    const nextQuantityIssued =
      sanitizedData.quantityIssued ?? existing.quantityIssued;

    if (nextQuantityIssued > nextOpeningStock + nextQuantityReceived) {
      throw new BadRequestException('Quantity issued exceeds available quantity');
    }

    const nextCondition = sanitizedData.condition ?? existing.condition;
    if (nextCondition === Condition.DAMAGED && nextQuantityIssued > 0) {
      throw new BadRequestException('Damaged parts cannot be issued');
    }

    if (
      sanitizedData.unitPrice !== undefined &&
      (sanitizedData.quantityIssued === undefined ||
        sanitizedData.quantityIssued <= existing.quantityIssued)
    ) {
      throw new BadRequestException('Unit price can be updated only during sales');
    }

    const nextAvailable = this.calculateAvailableQuantity(
      nextOpeningStock,
      nextQuantityReceived,
      nextQuantityIssued,
    );
    const nextStatus = this.calculateStatus(
      nextCondition,
      nextAvailable,
      nextQuantityIssued,
    );

    const updateData = {
      ...sanitizedData,
      availableQuantity: nextAvailable,
      status: nextStatus,
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    };

    return this.inventoryRepo.updateById(validatedId, updateData);
  }

  async remove(id: string) {
    const validatedId = validateObjectId(id, 'Inventory ID');
    const deleted = await this.inventoryRepo.deleteById(validatedId);
    if (!deleted) {
      throw new NotFoundException('Inventory not found');
    }
    return { message: 'Inventory deleted successfully' };
  }

  private calculateAvailableQuantity(
    openingStock: number,
    quantityReceived: number,
    quantityIssued: number,
  ) {
    return openingStock + quantityReceived - quantityIssued;
  }

  private calculateStatus(
    condition: Condition,
    availableQuantity: number,
    quantityIssued: number,
  ): Status {
    if (condition === Condition.DAMAGED) {
      return Status.DAMAGE_ONLY;
    }
    if (availableQuantity <= 0) {
      return Status.SOLD_OUT;
    }
    if (quantityIssued > 0) {
      return Status.PARTIAL_SOLD;
    }
    return Status.AVAILABLE;
  }

  private ensureNumber(value: number, field: string) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new BadRequestException(`${field} must be a number`);
    }
    if (value < 0) {
      throw new BadRequestException(`${field} cannot be negative`);
    }
    return value;
  }

  private normalizeDocuments(
    documents: CreateInventoryItemDto['documents'],
    authenticatedUser: AuthenticatedUser,
  ) {
    if (!Array.isArray(documents)) {
      return [];
    }

    type DocumentInput = {
      url: string;
      storageKey: string;
      provider: string;
      fileName: string;
      mimeType: string;
      size: number;
      uploadedBy?: string;
      uploadedAt?: string;
    };

    const isValidDocument = (value: unknown): value is DocumentInput => {
      if (!value || typeof value !== 'object') {
        return false;
      }
      const record = value as Record<string, unknown>;
      return (
        typeof record.url === 'string' &&
        typeof record.storageKey === 'string' &&
        typeof record.provider === 'string' &&
        typeof record.fileName === 'string' &&
        typeof record.mimeType === 'string' &&
        typeof record.size === 'number'
      );
    };

    return documents
      .filter(isValidDocument)
      .map((doc) => ({
        url: doc.url,
        storageKey: doc.storageKey,
        provider: doc.provider,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        uploadedBy: doc.uploadedBy
          ? new Types.ObjectId(doc.uploadedBy)
          : new Types.ObjectId(authenticatedUser.userId),
        uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
      }));
  }
}
