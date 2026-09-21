import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
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
import { VehicleInvoiceRepository } from 'src/invoice/vehicle-invoice.repository';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import type { Inventory } from './inventory.schema';
import { YardService } from 'src/yard/yard.service';
import { normalizePartType } from 'src/common/utils/part-type.util';
import { MaterialMasterService } from 'src/material-master/material-master.service';
import { PartCatalogService } from 'src/part-catalog/part-catalog.service';
import { InventoryFormBucket } from 'src/common/enum/materialFormSection.enum';
import { WeightUnit } from 'src/common/enum/weightUnit.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { LeadService } from 'src/lead/lead.service';
import {
  andMongoFilters,
  isStaffUser,
  sameOrganization,
  staffInvoiceOwnerFilter,
  staffOwnsInvoiceRecord,
} from 'src/common/access/data-scope';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly vehicleInvoiceRepo: VehicleInvoiceRepository,
    @Inject(forwardRef(() => YardService))
    private readonly yardService: YardService,
    private readonly materialMasterService: MaterialMasterService,
    private readonly partCatalogService: PartCatalogService,
    private readonly leadService: LeadService,
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
        this.invoiceRepo.findById(invoiceId),
        this.vehicleInvoiceRepo.findById(vechileId),
        this.inventoryRepo.existsByVehicleId(vechileId),
      ]);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const orgId = authenticatedUser.orgId;
      if (!orgId || !sameOrganization(invoice.organizationId, orgId)) {
        throw new NotFoundException('Invoice not found');
      }
      await this.assertStaffCanAccessInvoice(invoice, authenticatedUser);
      if (!vechileInvoice) {
        throw new NotFoundException('Vehicle invoice not found');
      }
      if (!sameOrganization(vechileInvoice.organizationId, orgId)) {
        throw new NotFoundException('Vehicle invoice not found');
      }
      if (vechileInvoice.invoiceId?.toString() !== invoiceId) {
        throw new BadRequestException('Vehicle does not belong to invoice');
      }

      await this.yardService.assertCanCreateInventory(vechileId);

      const resolvedOrgId =
        (vechileInvoice as { organizationId?: Types.ObjectId }).organizationId?.toString() ||
        authenticatedUser.orgId;
      if (!resolvedOrgId) {
        throw new BadRequestException('Organization not found');
      }

      const vechileModel =
        (vechileInvoice as { model_name?: string }).model_name ?? 'UNKNOWN';

      const parts = sanitizedData.parts ?? [];
      const records = await Promise.all(
        parts.map(async (part) => {
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

          const massFields = await this.resolveMassFields(part, orgId);

          if (part.catalogPartId) {
            await this.partCatalogService.rememberOrgDefaults(
              orgId,
              part.catalogPartId,
              {
                stateOfMatter: massFields.stateOfMatter,
                materialCode: massFields.materialCode,
                matterClass: massFields.matterClass,
                weightUnit: massFields.weightUnit,
              },
            );
          }

          return {
            invoiceId: new Types.ObjectId(invoiceId),
            vechileId: new Types.ObjectId(vechileId),
            auctionId:
              (vechileInvoice as { auctionId?: Types.ObjectId }).auctionId ||
              undefined,
            lotId:
              (vechileInvoice as { lotId?: Types.ObjectId }).lotId || undefined,
            auctionVehicleId:
              (vechileInvoice as { auctionVehicleId?: Types.ObjectId })
                .auctionVehicleId || undefined,
            purchaseInvoiceNumber: invoice.invoiceNumber,
            vechileModel,
            partName: part.partName,
            partType: normalizePartType(part.partType),
            ...(part.catalogPartId
              ? { catalogPartId: new Types.ObjectId(part.catalogPartId) }
              : {}),
            ...(part.catalogPartCode
              ? { catalogPartCode: part.catalogPartCode }
              : {}),
            openingStock,
            quantityReceived,
            quantityIssued,
            availableQuantity,
            condition: part.condition,
            status,
            unitPrice: part.unitPrice,
            ...massFields,
            documents: this.normalizeDocuments(part.documents, authenticatedUser),
            createdBy: new Types.ObjectId(authenticatedUser.userId),
          };
        }),
      );

      const created = await this.inventoryRepo.createMany(records);
      if (!existingParts) {
        await this.yardService.completeDismantling(vechileId, authenticatedUser);
      }
      return created;
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
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<Inventory> | Inventory[]> {
    const invoiceIds = await this.getAccessibleInvoiceIds(authenticatedUser);
    const filter: Record<string, unknown> = {
      invoiceId: { $in: invoiceIds },
    };
    if (filters.invoiceId) {
      const validatedId = validateObjectId(filters.invoiceId, 'Invoice ID');
      if (!invoiceIds.some((id) => id.toString() === validatedId)) {
        throw new NotFoundException('Invoice not found');
      }
      filter.invoiceId = new Types.ObjectId(validatedId);
    }
    if (filters.vechileId) {
      const validatedId = validateObjectId(filters.vechileId, 'Vehicle ID');
      filter.vechileId = new Types.ObjectId(validatedId);
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

  async findOne(id: string, authenticatedUser: AuthenticatedUser) {
    const validatedId = validateObjectId(id, 'Inventory ID');
    const record = await this.inventoryRepo.findById(validatedId);
    if (!record) {
      throw new NotFoundException('Inventory not found');
    }
    await this.assertInventoryAccessible(record, authenticatedUser);
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
    await this.assertInventoryAccessible(existing, authenticatedUser);

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

    const updateData: Record<string, unknown> = {
      ...sanitizedData,
      availableQuantity: nextAvailable,
      status: nextStatus,
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    };

    if (sanitizedData.partType) {
      updateData.partType = normalizePartType(sanitizedData.partType);
    }

    const orgId =
      authenticatedUser.orgId ||
      (
        await this.vehicleInvoiceRepo.findById(existing.vechileId.toString())
      )?.organizationId?.toString();

    if (
      orgId &&
      (sanitizedData.materialCode !== undefined ||
        sanitizedData.stateOfMatter !== undefined ||
        sanitizedData.matterClass !== undefined ||
        sanitizedData.weightUnit !== undefined ||
        sanitizedData.weightKg !== undefined)
    ) {
      const massFields = await this.resolveMassFields(
        {
          materialCode:
            sanitizedData.materialCode ?? existing.materialCode,
          stateOfMatter:
            sanitizedData.stateOfMatter ?? existing.stateOfMatter,
          matterClass: sanitizedData.matterClass ?? existing.matterClass,
          weightUnit: sanitizedData.weightUnit ?? existing.weightUnit,
          weightKg:
            sanitizedData.weightKg !== undefined
              ? sanitizedData.weightKg
              : existing.weightKg,
        },
        orgId,
      );
      Object.assign(updateData, massFields);

      const catalogPartId =
        sanitizedData.catalogPartId ||
        existing.catalogPartId?.toString();
      if (catalogPartId) {
        await this.partCatalogService.rememberOrgDefaults(
          orgId,
          catalogPartId,
          {
            stateOfMatter: massFields.stateOfMatter,
            materialCode: massFields.materialCode,
            matterClass: massFields.matterClass,
            weightUnit: massFields.weightUnit,
          },
        );
      }
    }

    return this.inventoryRepo.updateById(validatedId, updateData);
  }

  async findByVehicle(vechileId: string, authenticatedUser: AuthenticatedUser) {
    const validatedId = validateObjectId(vechileId, 'Vehicle ID');
    const vehicle = await this.vehicleInvoiceRepo.findById(validatedId);
    if (!vehicle || vehicle.isDeleted) {
      throw new NotFoundException('Vehicle not found');
    }
    if (!sameOrganization(vehicle.organizationId, authenticatedUser.orgId)) {
      throw new NotFoundException('Vehicle not found');
    }
    const invoice = await this.invoiceRepo.findById(vehicle.invoiceId.toString());
    if (!invoice) {
      throw new NotFoundException('Vehicle not found');
    }
    await this.assertStaffCanAccessInvoice(invoice, authenticatedUser);
    const parts = await this.inventoryRepo.findByVehicleId(validatedId);
    const totalWeightKg = parts.reduce(
      (sum, p) => sum + (typeof p.weightKg === 'number' ? p.weightKg : 0),
      0,
    );
    return {
      vehicle,
      parts,
      partCount: parts.length,
      totalWeightKg,
      grossWeightKg: vehicle.grossWeightKg ?? 0,
    };
  }

  async findVehicles(
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      organizationId?: string;
    },
    authenticatedUser: AuthenticatedUser,
  ) {
    const { page: safePage, limit: safeLimit } = getPagination(
      filters.page,
      filters.limit,
    );
    const invoiceIds = await this.getAccessibleInvoiceIds(authenticatedUser);
    return this.inventoryRepo.aggregateVehicles({
      page: safePage,
      limit: safeLimit,
      search: filters.search,
      organizationId: filters.organizationId,
      invoiceIds,
    });
  }

  async remove(id: string, authenticatedUser: AuthenticatedUser) {
    const validatedId = validateObjectId(id, 'Inventory ID');
    const existing = await this.inventoryRepo.findById(validatedId);
    if (!existing) {
      throw new NotFoundException('Inventory not found');
    }
    await this.assertInventoryAccessible(existing, authenticatedUser);
    const deleted = await this.inventoryRepo.deleteById(validatedId);
    if (!deleted) {
      throw new NotFoundException('Inventory not found');
    }
    return { message: 'Inventory deleted successfully' };
  }

  private async resolveMassFields(
    part: {
      materialCode?: string;
      stateOfMatter?: string;
      matterClass?: string;
      weightUnit?: string;
      weightKg?: number;
    },
    organizationId: string,
  ) {
    const weightKg =
      part.weightKg !== undefined && part.weightKg !== null
        ? this.ensureNumber(part.weightKg, 'weightKg')
        : undefined;
    const weightUnit = (part.weightUnit as WeightUnit) || WeightUnit.KG;

    let formBucket: InventoryFormBucket = InventoryFormBucket.UNMAPPED;
    let materialCode = part.materialCode?.trim().toUpperCase() || undefined;
    let matterClass = part.matterClass as MatterClass | undefined;
    let stateOfMatter = part.stateOfMatter as StateOfMatter | undefined;

    if (materialCode) {
      const material = await this.materialMasterService.resolveByCode(
        materialCode,
        organizationId,
      );
      if (material) {
        formBucket = material.formSection as unknown as InventoryFormBucket;
        if (!matterClass) matterClass = material.matterClass;
        if (!stateOfMatter && material.defaultStateOfMatter) {
          stateOfMatter = material.defaultStateOfMatter;
        }
      } else {
        formBucket = InventoryFormBucket.UNMAPPED;
      }
    }

    return {
      weightKg,
      weightUnit,
      stateOfMatter,
      materialCode,
      matterClass,
      formBucket: materialCode ? formBucket : InventoryFormBucket.UNMAPPED,
    };
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

  private async getAccessibleInvoiceIds(authenticatedUser: AuthenticatedUser) {
    const orgId = authenticatedUser.orgId;
    if (!orgId) {
      throw new BadRequestException('Organization not found');
    }
    let staffFilter: Record<string, unknown> | null = null;
    if (isStaffUser(authenticatedUser)) {
      const leadIds = await this.leadService.getOwnedLeadIds(authenticatedUser);
      staffFilter = staffInvoiceOwnerFilter(authenticatedUser, leadIds);
    }
    return this.invoiceRepo.findIds(
      andMongoFilters(
        {
          organizationId: new Types.ObjectId(orgId),
          isDeleted: { $ne: true },
        },
        staffFilter,
      ),
    );
  }

  private async assertStaffCanAccessInvoice(
    invoice: { createdBy?: unknown; leadId?: unknown; organizationId?: unknown },
    authenticatedUser: AuthenticatedUser,
  ) {
    if (!isStaffUser(authenticatedUser)) {
      return;
    }
    const leadIds = await this.leadService.getOwnedLeadIds(authenticatedUser);
    const owned = new Set(leadIds.map((id) => id.toString()));
    if (!staffOwnsInvoiceRecord(invoice, authenticatedUser, owned)) {
      throw new NotFoundException('Invoice not found');
    }
  }

  private async assertInventoryAccessible(
    record: { invoiceId?: unknown },
    authenticatedUser: AuthenticatedUser,
  ) {
    const invoiceId = record.invoiceId?.toString();
    if (!invoiceId) {
      throw new NotFoundException('Inventory not found');
    }
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (
      !invoice ||
      !sameOrganization(invoice.organizationId, authenticatedUser.orgId)
    ) {
      throw new NotFoundException('Inventory not found');
    }
    await this.assertStaffCanAccessInvoice(invoice, authenticatedUser);
  }
}
