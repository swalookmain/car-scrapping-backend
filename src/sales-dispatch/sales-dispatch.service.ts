import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import { BuyerRepository } from './buyer.repository';
import { SalesInvoiceRepository } from './sales-invoice.repository';
import { SalesInvoiceItemRepository } from './sales-invoice-item.repository';
import { InventoryMovementRepository } from './inventory-movement.repository';
import { InventoryRepository } from 'src/inventory/inventory.repository';
import { VehicleComplianceRepository } from 'src/vehicle-compliance/vehicle-compliance.repository';
import { VehicleInvoiceRepository } from 'src/invoice/vehicle-invoice.repository';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { getPagination } from 'src/common/utils/pagination.util';
import type { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';
import type {
  CreateSalesInvoiceDto,
  CreateSalesInvoiceItemDto,
} from './dto/create-sales-invoice.dto';
import type { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import type { QuerySalesInvoiceDto } from './dto/query-sales-invoice.dto';
import type { CreateBuyerDto } from './dto/create-buyer.dto';
import type { UpdateBuyerDto } from './dto/update-buyer.dto';
import type { QueryBuyersDto } from './dto/query-buyers.dto';
import { InventoryMovementType } from 'src/common/enum/inventoryMovementType.enum';
import { InventoryReferenceType } from 'src/common/enum/inventoryReferenceType.enum';

type InventoryLike = {
  _id: Types.ObjectId;
  vechileId: Types.ObjectId;
  purchaseInvoiceNumber: string;
  availableQuantity: number;
  quantityIssued: number;
  openingStock: number;
  quantityReceived: number;
  condition: Condition;
};

@Injectable()
export class SalesDispatchService {
  constructor(
    private readonly buyerRepository: BuyerRepository,
    private readonly salesInvoiceRepository: SalesInvoiceRepository,
    private readonly salesInvoiceItemRepository: SalesInvoiceItemRepository,
    private readonly inventoryMovementRepository: InventoryMovementRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly vehicleComplianceRepository: VehicleComplianceRepository,
    private readonly vehicleInvoiceRepository: VehicleInvoiceRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createBuyer(
    createBuyerDto: CreateBuyerDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const sanitizedData = sanitizeObject(createBuyerDto) as CreateBuyerDto;
    return this.buyerRepository.create({
      ...sanitizedData,
      organizationId: new Types.ObjectId(orgId),
    });
  }

  async getBuyers(
    query: QueryBuyersDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const orgId = this.getOrgId(authenticatedUser);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(orgId),
    };

    if (query.buyerType) {
      filter.buyerType = query.buyerType;
    }
    if (query.buyerName) {
      filter.buyerName = { $regex: query.buyerName, $options: 'i' };
    }

    const { page, limit } = getPagination(query.page, query.limit);
    const { data, total } = await this.buyerRepository.findPaginated(
      filter,
      page,
      limit,
    );
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as Record<string, unknown>[],
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getBuyerById(buyerId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedBuyerId = validateObjectId(buyerId, 'Buyer ID');
    const buyer = await this.buyerRepository.findByOrgAndId(orgId, validatedBuyerId);
    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }
    return buyer;
  }

  async updateBuyer(
    buyerId: string,
    updateBuyerDto: UpdateBuyerDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const existingBuyer = await this.getBuyerById(buyerId, authenticatedUser);
    const sanitizedData = sanitizeObject(updateBuyerDto) as UpdateBuyerDto;
    return this.buyerRepository.updateById(existingBuyer._id.toString(), {
      ...(sanitizedData as Record<string, unknown>),
    });
  }

  async deleteBuyer(buyerId: string, authenticatedUser: AuthenticatedUser) {
    const existingBuyer = await this.getBuyerById(buyerId, authenticatedUser);
    const existingInvoice = await this.salesInvoiceRepository.exists({
      buyerId: existingBuyer._id,
    });
    if (existingInvoice) {
      throw new BadRequestException(
        'Buyer cannot be deleted because sales invoices exist for this buyer',
      );
    }
    await this.buyerRepository.deleteById(existingBuyer._id.toString());
    return { message: 'Buyer deleted successfully' };
  }

  async createDraftInvoice(
    createSalesInvoiceDto: CreateSalesInvoiceDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const orgId = this.getOrgId(authenticatedUser);
      const sanitizedData = sanitizeObject(
        createSalesInvoiceDto,
      ) as CreateSalesInvoiceDto;
      const buyer = await this.getBuyerById(sanitizedData.buyerId, authenticatedUser);
      const validatedItems = await this.validateAndBuildInvoiceItems(
        sanitizedData.items,
      );
      const subtotalAmount = this.getSubtotal(validatedItems);
      const gstApplicable = sanitizedData.gstApplicable ?? true;
      const gstRate = gstApplicable ? (sanitizedData.gstRate ?? 0) : 0;
      const gstAmount = gstApplicable ? (subtotalAmount * gstRate) / 100 : 0;
      const totalAmount = subtotalAmount + gstAmount;

      const invoice = await this.salesInvoiceRepository.create({
        organizationId: new Types.ObjectId(orgId),
        invoiceNumber: sanitizedData.invoiceNumber,
        buyerId: new Types.ObjectId(buyer._id),
        invoiceDate: new Date(sanitizedData.invoiceDate),
        gstApplicable,
        gstRate,
        gstAmount,
        reverseChargeApplicable: sanitizedData.reverseChargeApplicable ?? false,
        subtotalAmount,
        totalAmount,
        ewayBillNumber: sanitizedData.ewayBillNumber,
        ewayBillDocumentUrl: sanitizedData.ewayBillDocumentUrl,
        status: SalesInvoiceStatus.DRAFT,
        createdBy: new Types.ObjectId(authenticatedUser.userId),
      });

      await this.salesInvoiceItemRepository.createMany(
        validatedItems.map((item) => ({
          salesInvoiceId: invoice._id,
          partId: item.partId,
          itemCode: item.itemCode,
          vehicleCode: item.vehicleCode,
          purchaseInvoiceNumber: item.purchaseInvoiceNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      );

      return this.getSalesInvoiceById(invoice._id.toString(), authenticatedUser);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'SalesDispatchService');
      throw new BadRequestException('Failed to create draft sales invoice');
    }
  }

  async getSalesInvoices(
    query: QuerySalesInvoiceDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const orgId = this.getOrgId(authenticatedUser);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(orgId),
    };
    if (query.buyerId) {
      filter.buyerId = new Types.ObjectId(validateObjectId(query.buyerId, 'Buyer ID'));
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.invoiceNumber) {
      filter.invoiceNumber = { $regex: query.invoiceNumber, $options: 'i' };
    }

    const { page, limit } = getPagination(query.page, query.limit);
    const { data, total } = await this.salesInvoiceRepository.findPaginated(
      filter,
      page,
      limit,
    );
    const totalPages = Math.ceil(total / limit);
    return {
      data: data as unknown as Record<string, unknown>[],
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getSalesInvoiceById(
    salesInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedInvoiceId = validateObjectId(salesInvoiceId, 'Sales Invoice ID');
    const invoice = await this.salesInvoiceRepository.findByOrgAndId(
      orgId,
      validatedInvoiceId,
    );
    if (!invoice) {
      throw new NotFoundException('Sales invoice not found');
    }
    const items = await this.salesInvoiceItemRepository.findBySalesInvoiceId(
      validatedInvoiceId,
    );
    return {
      invoice,
      items,
    };
  }

  async updateDraftInvoice(
    salesInvoiceId: string,
    updateSalesInvoiceDto: UpdateSalesInvoiceDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const existing = await this.getSalesInvoiceById(salesInvoiceId, authenticatedUser);
    if (existing.invoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft sales invoices can be edited');
    }

    const sanitizedData = sanitizeObject(
      updateSalesInvoiceDto,
    ) as UpdateSalesInvoiceDto;
    const updatePayload: Record<string, unknown> = {};

    if (sanitizedData.buyerId) {
      const buyer = await this.getBuyerById(sanitizedData.buyerId, authenticatedUser);
      updatePayload.buyerId = buyer._id;
    }
    if (sanitizedData.invoiceNumber) {
      updatePayload.invoiceNumber = sanitizedData.invoiceNumber;
    }
    if (sanitizedData.invoiceDate) {
      updatePayload.invoiceDate = new Date(sanitizedData.invoiceDate);
    }
    if (sanitizedData.reverseChargeApplicable !== undefined) {
      updatePayload.reverseChargeApplicable = sanitizedData.reverseChargeApplicable;
    }
    if (sanitizedData.ewayBillNumber !== undefined) {
      updatePayload.ewayBillNumber = sanitizedData.ewayBillNumber;
    }
    if (sanitizedData.ewayBillDocumentUrl !== undefined) {
      updatePayload.ewayBillDocumentUrl = sanitizedData.ewayBillDocumentUrl;
    }

    let lineItemsForTotals = existing.items.map((item) => ({
      lineTotal: item.lineTotal,
    }));
    if (sanitizedData.items && sanitizedData.items.length > 0) {
      const validatedItems = await this.validateAndBuildInvoiceItems(
        sanitizedData.items,
      );
      await this.salesInvoiceItemRepository.deleteBySalesInvoiceId(
        existing.invoice._id.toString(),
      );
      await this.salesInvoiceItemRepository.createMany(
        validatedItems.map((item) => ({
          salesInvoiceId: existing.invoice._id,
          partId: item.partId,
          itemCode: item.itemCode,
          vehicleCode: item.vehicleCode,
          purchaseInvoiceNumber: item.purchaseInvoiceNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      );
      lineItemsForTotals = validatedItems.map((item) => ({
        lineTotal: item.lineTotal,
      }));
    }

    const subtotalAmount = this.getSubtotal(
      lineItemsForTotals,
    );
    const gstApplicable =
      sanitizedData.gstApplicable ?? existing.invoice.gstApplicable;
    const gstRate = gstApplicable
      ? sanitizedData.gstRate ?? existing.invoice.gstRate ?? 0
      : 0;
    const gstAmount = gstApplicable ? (subtotalAmount * gstRate) / 100 : 0;
    const totalAmount = subtotalAmount + gstAmount;

    updatePayload.gstApplicable = gstApplicable;
    updatePayload.gstRate = gstRate;
    updatePayload.gstAmount = gstAmount;
    updatePayload.subtotalAmount = subtotalAmount;
    updatePayload.totalAmount = totalAmount;

    await this.salesInvoiceRepository.updateById(
      existing.invoice._id.toString(),
      updatePayload,
    );
    return this.getSalesInvoiceById(existing.invoice._id.toString(), authenticatedUser);
  }

  async confirmSalesInvoice(
    salesInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const existing = await this.getSalesInvoiceById(salesInvoiceId, authenticatedUser);
      if (existing.invoice.status !== SalesInvoiceStatus.DRAFT) {
        throw new BadRequestException('Only draft sales invoices can be confirmed');
      }
      if (!existing.items.length) {
        throw new BadRequestException('Cannot confirm invoice without items');
      }

      for (const item of existing.items) {
        if (item.unitPrice <= 0) {
          throw new BadRequestException(
            `Unit price must be greater than zero for item ${item.itemCode}`,
          );
        }
      }

      const orgId = this.getOrgId(authenticatedUser);
      const movementPayload: Array<Record<string, unknown>> = [];

      for (const item of existing.items) {
        const part = await this.inventoryRepository.findById(item.partId.toString());
        if (!part) {
          throw new NotFoundException(`Part not found for item ${item.itemCode}`);
        }
        if (part.condition === Condition.DAMAGED) {
          throw new BadRequestException(
            `Damaged part cannot be sold: ${item.itemCode}`,
          );
        }
        if (part.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient inventory for item ${item.itemCode}`,
          );
        }

        const codGenerated =
          await this.vehicleComplianceRepository.hasGeneratedCodForVehicle(
            part.vechileId.toString(),
          );
        if (!codGenerated) {
          throw new BadRequestException(
            `COD not generated for vehicle linked to item ${item.itemCode}`,
          );
        }

        const nextQuantityIssued = part.quantityIssued + item.quantity;
        const nextAvailableQuantity =
          part.openingStock + part.quantityReceived - nextQuantityIssued;

        await this.inventoryRepository.updateById(part._id.toString(), {
          quantityIssued: nextQuantityIssued,
          availableQuantity: nextAvailableQuantity,
          status: this.calculateStatus(
            part.condition,
            nextAvailableQuantity,
            nextQuantityIssued,
          ),
          unitPrice: item.unitPrice,
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
        });

        movementPayload.push({
          organizationId: new Types.ObjectId(orgId),
          partId: part._id,
          movementType: InventoryMovementType.ISSUED,
          referenceType: InventoryReferenceType.SALES_INVOICE,
          referenceId: existing.invoice._id,
          quantity: item.quantity,
          createdBy: new Types.ObjectId(authenticatedUser.userId),
        });
      }

      await this.inventoryMovementRepository.createMany(movementPayload);
      await this.salesInvoiceRepository.updateById(existing.invoice._id.toString(), {
        status: SalesInvoiceStatus.CONFIRMED,
      });

      return this.getSalesInvoiceById(existing.invoice._id.toString(), authenticatedUser);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(errorMessage, errorStack, 'SalesDispatchService');
      throw new BadRequestException('Failed to confirm sales invoice');
    }
  }

  async cancelSalesInvoice(
    salesInvoiceId: string,
    authenticatedUser: AuthenticatedUser,
  ) {
    const existing = await this.getSalesInvoiceById(salesInvoiceId, authenticatedUser);
    if (existing.invoice.status === SalesInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Sales invoice is already cancelled');
    }

    if (existing.invoice.status === SalesInvoiceStatus.CONFIRMED) {
      const orgId = this.getOrgId(authenticatedUser);
      const movementPayload: Array<Record<string, unknown>> = [];

      for (const item of existing.items) {
        const part = await this.inventoryRepository.findById(item.partId.toString());
        if (!part) {
          throw new NotFoundException(`Part not found for item ${item.itemCode}`);
        }
        if (part.quantityIssued < item.quantity) {
          throw new BadRequestException(
            `Cannot reverse quantity for item ${item.itemCode}`,
          );
        }

        const nextQuantityIssued = part.quantityIssued - item.quantity;
        const nextAvailableQuantity =
          part.openingStock + part.quantityReceived - nextQuantityIssued;

        await this.inventoryRepository.updateById(part._id.toString(), {
          quantityIssued: nextQuantityIssued,
          availableQuantity: nextAvailableQuantity,
          status: this.calculateStatus(
            part.condition,
            nextAvailableQuantity,
            nextQuantityIssued,
          ),
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
        });

        movementPayload.push({
          organizationId: new Types.ObjectId(orgId),
          partId: part._id,
          movementType: InventoryMovementType.RECEIVED,
          referenceType: InventoryReferenceType.SALES_INVOICE,
          referenceId: existing.invoice._id,
          quantity: item.quantity,
          createdBy: new Types.ObjectId(authenticatedUser.userId),
        });
      }

      await this.inventoryMovementRepository.createMany(movementPayload);
    }

    await this.salesInvoiceRepository.updateById(existing.invoice._id.toString(), {
      status: SalesInvoiceStatus.CANCELLED,
    });

    return this.getSalesInvoiceById(existing.invoice._id.toString(), authenticatedUser);
  }

  private async validateAndBuildInvoiceItems(items: CreateSalesInvoiceItemDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('At least one invoice item is required');
    }

    const partIds = items.map((item) => validateObjectId(item.partId, 'Part ID'));
    const parts = await this.inventoryRepository.findAllByFilter({
      _id: { $in: partIds.map((id) => new Types.ObjectId(id)) },
    });
    if (parts.length !== partIds.length) {
      throw new BadRequestException('One or more parts are invalid');
    }

    const partMap = new Map<string, InventoryLike>();
    (parts as unknown as InventoryLike[]).forEach((part) => {
      partMap.set(part._id.toString(), part);
    });

    const vehicles = await Promise.all(
      Array.from(
        new Set((parts as unknown as InventoryLike[]).map((part) => part.vechileId.toString())),
      ).map((vehicleId) => this.vehicleInvoiceRepository.findById(vehicleId)),
    );
    const vehicleMap = new Map<string, string>();
    vehicles.forEach((vehicle) => {
      if (vehicle) {
        vehicleMap.set(vehicle._id.toString(), vehicle.registration_number);
      }
    });

    return items.map((item) => {
      const part = partMap.get(item.partId);
      if (!part) {
        throw new BadRequestException(`Invalid part selected: ${item.partId}`);
      }
      if (part.condition === Condition.DAMAGED) {
        throw new BadRequestException(`Damaged part cannot be sold: ${item.itemCode}`);
      }
      if (part.availableQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient available quantity for ${item.itemCode}`);
      }

      return {
        partId: part._id,
        itemCode: item.itemCode,
        vehicleCode: vehicleMap.get(part.vechileId.toString()) ?? 'UNKNOWN',
        purchaseInvoiceNumber: part.purchaseInvoiceNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
      };
    });
  }

  private getSubtotal(items: Array<{ lineTotal: number }>) {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
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

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }
}
