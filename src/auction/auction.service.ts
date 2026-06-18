import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { AuctionStatus } from 'src/common/enum/auctionStatus.enum';
import { AuctionRepository } from './auction.repository';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionLotRepository } from './auction-lot.repository';
import { CreateAuctionLotDto } from './dto/create-auction-lot.dto';
import { UpdateAuctionLotDto } from './dto/update-auction-lot.dto';
import { AuctionVehicleRepository } from './auction-vehicle.repository';
import { CreateAuctionVehicleDto } from './dto/create-auction-vehicle.dto';
import { UpdateAuctionVehicleDto } from './dto/update-auction-vehicle.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { SellerType } from 'src/common/enum/sellerType.enum';
import { AuctionCounterRepository } from './auction-counter.repository';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { AuctionVehicleDocumentRepository } from './auction-vehicle-document.repository';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { CreateAuctionVehicleBatchDto } from './dto/create-auction-vehicle.dto';
import { AuctionVehicleImageType } from './auction-vehicle-document.schema';
import { LifecycleStateService } from './lifecycle/lifecycle-state.service';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';

@Injectable()
export class AuctionService implements OnModuleInit {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly auctionLotRepository: AuctionLotRepository,
    private readonly lifecycleStateService: LifecycleStateService,
    private readonly auctionVehicleRepository: AuctionVehicleRepository,
    private readonly auctionCounterRepository: AuctionCounterRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly auctionVehicleDocumentRepository: AuctionVehicleDocumentRepository,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    try {
      const droppedIndexes =
        await this.auctionRepository.dropLegacyAuctionCodeIndexes();
      if (droppedIndexes.length > 0) {
        this.logger.warn(
          `Dropped legacy auction indexes: ${droppedIndexes.join(', ')}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown legacy index cleanup error';
      this.logger.error(`Failed to clean legacy auction indexes: ${message}`);
    }
  }

  private getOrgId(authenticatedUser: AuthenticatedUser) {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }

  private getAuctionStatus(auction: {
    startDateTime: Date;
    endDateTime: Date;
    cancelledAt?: Date;
    dealDoneAt?: Date;
  }) {
    if (auction.cancelledAt) return AuctionStatus.CANCELLED;
    if (auction.dealDoneAt) return AuctionStatus.DEAL_DONE;
    const now = new Date();
    if (now < auction.startDateTime) return AuctionStatus.UPCOMING;
    if (now >= auction.startDateTime && now <= auction.endDateTime) {
      return AuctionStatus.ONGOING;
    }
    return AuctionStatus.STA;
  }

  private getFinancialYear(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStartYear = month >= 3 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    const shortStart = String(fyStartYear).slice(-2);
    const shortEnd = String(fyEndYear).slice(-2);
    return `${shortStart}-${shortEnd}`;
  }

  private async generateAuctionCode(orgId: string, auctionDate: Date) {
    const financialYear = this.getFinancialYear(auctionDate);
    const sequence = await this.auctionCounterRepository.getNextSequence(
      orgId,
      financialYear,
    );
    return `AUC/${financialYear}/${String(sequence).padStart(6, '0')}`;
  }

  private normalizeOfficers(officers: unknown) {
    const list = Array.isArray(officers) ? officers : [];
    return list
      .filter((officer) => officer && typeof officer === 'object')
      .map((officer) => {
        const typed = officer as Record<string, unknown>;
        return {
          name: typeof typed.name === 'string' ? typed.name.trim() : '',
          email: typeof typed.email === 'string' ? typed.email.trim() : undefined,
          phoneNumber:
            typeof typed.phoneNumber === 'string'
              ? typed.phoneNumber.replace(/\D/g, '')
              : undefined,
          officerType:
            typeof typed.officerType === 'string' ? typed.officerType.trim().toUpperCase() : undefined,
        };
      })
      .filter((officer) => officer.name);
  }

  private normalizeAuctionerName(value?: string) {
    const normalized = (value || 'MSTC').toUpperCase().trim();
    if (normalized === 'GEM') return 'GEM';
    if (normalized === 'OTHERS' || normalized === 'OTHER') return 'OTHERS';
    return 'MSTC';
  }

  private normalizeSellerInfo(data: Partial<CreateAuctionDto>) {
    const sellerAccountNumber = data.sellerAccountNumber?.trim() || undefined;
    return {
      sellerName: data.sellerName?.trim() || undefined,
      sellerMobileNumber: data.sellerMobileNumber?.replace(/\D/g, '') || undefined,
      sellerEmail: data.sellerEmail?.trim() || undefined,
      sellerAccountNumber,
      sellerTaxMode: data.sellerTaxMode || (sellerAccountNumber ? 'FCM' : 'RCM'),
    };
  }

  private normalizeAuctionVehiclePlate(vehicle: Partial<CreateAuctionVehicleDto>): string | undefined {
    const raw = vehicle.registrationNumber || vehicle.vehicleNumber;
    if (!raw || !String(raw).trim()) return undefined;
    return String(raw).trim();
  }

  private validateVehiclePayload(vehicle: Partial<CreateAuctionVehicleDto>) {
    if (vehicle.chassisLast5 && !/^[A-Z0-9]{5}$/.test(vehicle.chassisLast5.toUpperCase())) {
      throw new BadRequestException('Last 5 chassis digits must be 5 uppercase alphanumeric');
    }
    if (vehicle.yearOfManufacture) {
      const currentYear = new Date().getFullYear() + 1;
      if (vehicle.yearOfManufacture < 1980 || vehicle.yearOfManufacture > currentYear) {
        throw new BadRequestException('Year of manufacture is out of valid range');
      }
    }
  }

  private async assertAuctionEditable(auctionId: string, orgId: string) {
    const confirmedInvoice = await this.invoiceRepository.findOne({
      organizationId: new Types.ObjectId(orgId),
      sellerType: SellerType.MSTC,
      auctionId: new Types.ObjectId(auctionId),
      status: InvoiceStatus.CONFIRMED,
      isDeleted: { $ne: true },
    });
    if (confirmedInvoice) {
      throw new BadRequestException(
        'Auction cannot be edited after vehicle invoice is confirmed',
      );
    }
  }

  async createAuction(
    createAuctionDto: CreateAuctionDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      const sanitizedData = sanitizeObject(createAuctionDto) as CreateAuctionDto;
      const orgId = this.getOrgId(authenticatedUser);
      const auctionDate = new Date(sanitizedData.auctionDate);
      const startDateTime = new Date(sanitizedData.startDateTime);
      const endDateTime = new Date(sanitizedData.endDateTime);
      if (endDateTime <= startDateTime) {
        throw new BadRequestException('End time must be after start time');
      }
      const inspectionFromDate = sanitizedData.inspectionFromDate
        ? new Date(sanitizedData.inspectionFromDate)
        : undefined;
      const inspectionToDate = sanitizedData.inspectionToDate
        ? new Date(sanitizedData.inspectionToDate)
        : undefined;
      if (
        inspectionFromDate &&
        inspectionToDate &&
        inspectionToDate < inspectionFromDate
      ) {
        throw new BadRequestException(
          'Inspection to date must be after inspection from date',
        );
      }
      const officers = this.normalizeOfficers(sanitizedData.officers);
      const sellerInfo = this.normalizeSellerInfo(sanitizedData);
      return await this.auctionRepository.create({
        sourcePlatform:
          sanitizedData.sourcePlatform ||
          this.normalizeAuctionerName(sanitizedData.auctionerName),
        auctionNumber: sanitizedData.auctionNumber,
        sellerEntityName: sanitizedData.sellerEntityName,
        sellerEntityCode: sanitizedData.sellerEntityCode,
        state: sanitizedData.state,
        city: sanitizedData.city,
        emdAmount: sanitizedData.emdAmount,
        emdReference: sanitizedData.emdReference,
        remarks: sanitizedData.remarks,
        auctionLocation: sanitizedData.auctionLocation || sanitizedData.yardLocation,
        vehicleLocation:
          sanitizedData.vehicleLocation ||
          sanitizedData.auctionLocation ||
          sanitizedData.yardLocation,
        auctionerName: this.normalizeAuctionerName(sanitizedData.auctionerName),
        officers,
        ...sellerInfo,
        auctionDate,
        startDateTime,
        endDateTime,
        ...(inspectionFromDate ? { inspectionFromDate } : {}),
        ...(inspectionToDate ? { inspectionToDate } : {}),
        bidSubmissionDeadline: sanitizedData.bidSubmissionDeadline
          ? new Date(sanitizedData.bidSubmissionDeadline)
          : undefined,
        emdPaidOn: sanitizedData.emdPaidOn
          ? new Date(sanitizedData.emdPaidOn)
          : undefined,
        status: this.getAuctionStatus({ startDateTime, endDateTime }),
        organizationId: new Types.ObjectId(orgId),
        createdBy: new Types.ObjectId(authenticatedUser.userId),
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown auction create error';
      if (message.includes('auctionNumber')) {
        throw new BadRequestException(
          'Auction number already exists for this organization',
        );
      }
      if (message.includes('auctionCode')) {
        throw new BadRequestException(
          'Legacy auction code index blocked creation. Please retry; startup cleanup should remove it.',
        );
      }
      throw error;
    }
  }

  async getAuctions(
    authenticatedUser: AuthenticatedUser,
    page = 1,
    limit = 10,
    status?: AuctionStatus,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const { page: safePage, limit: safeLimit } = getPagination(page, limit);
    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(orgId),
    };
    if (status) filter.status = status;
    const { data, total } = await this.auctionRepository.findPaginated(
      filter,
      safePage,
      safeLimit,
      { auctionDate: -1 },
    );
    const enriched = await Promise.all(
      data.map(async (auction) => {
        const lots = await this.auctionLotRepository.findByAuction(
          orgId,
          auction._id.toString(),
        );
        const auctionSummary = this.lifecycleStateService.deriveAuctionSummary(lots);
        const availableActions = this.lifecycleStateService.deriveAvailableActions(
          lots,
          !!auction.cancelledAt,
        );
        return {
          ...auction.toObject(),
          auctionSummary,
          availableActions,
        };
      }),
    );
    return {
      data: enriched,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getAuctionById(id: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    const [lots, vehicles] = await Promise.all([
      this.auctionLotRepository.findByAuction(orgId, auctionId),
      this.auctionVehicleRepository.findByAuction(orgId, auctionId),
    ]);
    return { ...auction.toObject(), lots, vehicles };
  }

  async updateAuction(
    id: string,
    updateAuctionDto: UpdateAuctionDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    await this.assertAuctionEditable(auctionId, orgId);
    const sanitized = sanitizeObject(updateAuctionDto) as UpdateAuctionDto;
    const startDateTime = sanitized.startDateTime
      ? new Date(sanitized.startDateTime)
      : auction.startDateTime;
    const endDateTime = sanitized.endDateTime
      ? new Date(sanitized.endDateTime)
      : auction.endDateTime;
    if (endDateTime <= startDateTime) {
      throw new BadRequestException('End time must be after start time');
    }
    const inspectionFromDate = sanitized.inspectionFromDate
      ? new Date(sanitized.inspectionFromDate)
      : auction.inspectionFromDate;
    const inspectionToDate = sanitized.inspectionToDate
      ? new Date(sanitized.inspectionToDate)
      : auction.inspectionToDate;
    if (inspectionFromDate && inspectionToDate && inspectionToDate < inspectionFromDate) {
      throw new BadRequestException(
        'Inspection to date must be after inspection from date',
      );
    }
    const nextStatus =
      auction.cancelledAt || auction.dealDoneAt
        ? auction.status
        : this.getAuctionStatus({ startDateTime, endDateTime });
    const sellerInfo = this.normalizeSellerInfo(sanitized);

    return this.auctionRepository.updateById(auctionId, {
      ...sanitized,
      ...(sanitized.auctionLocation || sanitized.yardLocation
        ? { auctionLocation: sanitized.auctionLocation || sanitized.yardLocation }
        : {}),
      ...(sanitized.vehicleLocation ||
      sanitized.auctionLocation ||
      sanitized.yardLocation
        ? {
            vehicleLocation:
              sanitized.vehicleLocation ||
              sanitized.auctionLocation ||
              sanitized.yardLocation,
          }
        : {}),
      ...(sanitized.auctionerName
        ? { auctionerName: this.normalizeAuctionerName(sanitized.auctionerName) }
        : {}),
      ...sellerInfo,
      ...(sanitized.officers ? { officers: this.normalizeOfficers(sanitized.officers) } : {}),
      ...(sanitized.auctionDate ? { auctionDate: new Date(sanitized.auctionDate) } : {}),
      ...(sanitized.startDateTime ? { startDateTime } : {}),
      ...(sanitized.endDateTime ? { endDateTime } : {}),
      ...(sanitized.inspectionFromDate ? { inspectionFromDate } : {}),
      ...(sanitized.inspectionToDate ? { inspectionToDate } : {}),
      ...(sanitized.bidSubmissionDeadline
        ? { bidSubmissionDeadline: new Date(sanitized.bidSubmissionDeadline) }
        : {}),
      ...(sanitized.emdPaidOn ? { emdPaidOn: new Date(sanitized.emdPaidOn) } : {}),
      status: nextStatus,
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async closeDeal(id: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.cancelledAt) {
      throw new BadRequestException('Cancelled auction cannot be closed');
    }
    return this.auctionRepository.updateById(auctionId, {
      status: AuctionStatus.DEAL_DONE,
      dealDoneAt: new Date(),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async updateAuctionStatus(
    id: string,
    status: AuctionStatus,
    dealDoneAt: string | undefined,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    await this.assertAuctionEditable(auctionId, orgId);
    if (status === AuctionStatus.DEAL_DONE && !dealDoneAt) {
      throw new BadRequestException('Deal done date and time is required');
    }
    return this.auctionRepository.updateById(auctionId, {
      status,
      ...(status === AuctionStatus.DEAL_DONE
        ? { dealDoneAt: new Date(dealDoneAt as string), dealClosedAt: undefined }
        : {}),
      ...(status !== AuctionStatus.DEAL_DONE ? { dealDoneAt: undefined } : {}),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async cancelAuction(
    id: string,
    cancellationReason: string | undefined,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    await this.assertAuctionEditable(auctionId, orgId);
    return this.auctionRepository.updateById(auctionId, {
      status: AuctionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: cancellationReason?.trim() || 'Cancelled by user',
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
  }

  async addLot(
    auctionId: string,
    createAuctionLotDto: CreateAuctionLotDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedAuctionId = validateObjectId(auctionId, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(
      orgId,
      validatedAuctionId,
    );
    if (!auction) throw new NotFoundException('Auction not found');
    await this.assertAuctionEditable(validatedAuctionId, orgId);
    const sanitized = sanitizeObject(createAuctionLotDto) as CreateAuctionLotDto;
    const lot = await this.auctionLotRepository.create({
      lotName: sanitized.lotName,
      lotNumber: sanitized.lotNumber,
      preEmdAmount: sanitized.preEmdAmount,
      lotDescription: sanitized.lotDescription,
      vehicleCount: sanitized.vehicleCount,
      category: sanitized.category,
      bidAmount: sanitized.bidAmount,
      awardedAmount: sanitized.awardedAmount,
      workOrderNumber: sanitized.workOrderNumber,
      loaNumber: sanitized.loaNumber,
      status: sanitized.status,
      remarks: sanitized.remarks,
      auctionId: new Types.ObjectId(validatedAuctionId),
      organizationId: new Types.ObjectId(orgId),
      ...(sanitized.loaDate ? { loaDate: new Date(sanitized.loaDate) } : {}),
      ...(sanitized.pickupWindowStart
        ? { pickupWindowStart: new Date(sanitized.pickupWindowStart) }
        : {}),
      ...(sanitized.pickupWindowEnd
        ? { pickupWindowEnd: new Date(sanitized.pickupWindowEnd) }
        : {}),
      createdBy: new Types.ObjectId(authenticatedUser.userId),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
    await this.syncAuctionInvoiceMapping(validatedAuctionId, orgId);
    return lot;
  }

  async getLots(auctionId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedAuctionId = validateObjectId(auctionId, 'Auction ID');
    return this.auctionLotRepository.findByAuction(orgId, validatedAuctionId);
  }

  async updateLot(
    lotId: string,
    updateAuctionLotDto: UpdateAuctionLotDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.auctionLotRepository.findByOrgAndId(orgId, validatedLotId);
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertAuctionEditable(lot.auctionId.toString(), orgId);
    const sanitized = sanitizeObject(updateAuctionLotDto) as UpdateAuctionLotDto;
    const updated = await this.auctionLotRepository.updateById(validatedLotId, {
      ...sanitized,
      ...(sanitized.loaDate ? { loaDate: new Date(sanitized.loaDate) } : {}),
      ...(sanitized.pickupWindowStart
        ? { pickupWindowStart: new Date(sanitized.pickupWindowStart) }
        : {}),
      ...(sanitized.pickupWindowEnd
        ? { pickupWindowEnd: new Date(sanitized.pickupWindowEnd) }
        : {}),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
    await this.syncAuctionInvoiceMapping(lot.auctionId.toString(), orgId);
    return updated;
  }

  async addVehicle(
    lotId: string,
    createAuctionVehicleDto: CreateAuctionVehicleDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.auctionLotRepository.findByOrgAndId(orgId, validatedLotId);
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertAuctionEditable(lot.auctionId.toString(), orgId);
    const sanitized = sanitizeObject(createAuctionVehicleDto) as CreateAuctionVehicleDto;
    this.validateVehiclePayload(sanitized);
    const plate = this.normalizeAuctionVehiclePlate(sanitized);
    const vehicle = await this.auctionVehicleRepository.create({
      vehicleType: sanitized.vehicleType,
      make: sanitized.make,
      vehicleModel: sanitized.model,
      variant: sanitized.variant,
      vehicleNumber: plate || sanitized.vehicleNumber?.trim(),
      registrationNumber: plate,
      chassisLast5: sanitized.chassisLast5?.toUpperCase(),
      yearOfManufacture: sanitized.yearOfManufacture,
      color: sanitized.color,
      vehicleCondition: sanitized.vehicleCondition,
      rcAvailable: sanitized.rcAvailable,
      keyAvailable: sanitized.keyAvailable,
      status: sanitized.status,
      remarks: sanitized.remarks,
      lotId: new Types.ObjectId(validatedLotId),
      auctionId: lot.auctionId,
      organizationId: new Types.ObjectId(orgId),
      ...(sanitized.pickupDate ? { pickupDate: new Date(sanitized.pickupDate) } : {}),
      createdBy: new Types.ObjectId(authenticatedUser.userId),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
    await this.syncAuctionInvoiceMapping(lot.auctionId.toString(), orgId);
    return vehicle;
  }

  async addVehiclesBatch(
    lotId: string,
    createAuctionVehicleBatchDto: CreateAuctionVehicleBatchDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.auctionLotRepository.findByOrgAndId(orgId, validatedLotId);
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertAuctionEditable(lot.auctionId.toString(), orgId);
    const vehicles = Array.isArray(createAuctionVehicleBatchDto.vehicles)
      ? createAuctionVehicleBatchDto.vehicles
      : [];
    if (vehicles.length !== lot.vehicleCount) {
      throw new BadRequestException(
        `Exactly ${lot.vehicleCount} vehicles are required for this lot`,
      );
    }
    const existingVehicles = await this.auctionVehicleRepository.findByLot(
      orgId,
      validatedLotId,
    );
    for (const existingVehicle of existingVehicles) {
      await this.auctionVehicleRepository.deleteById(existingVehicle._id.toString());
    }
    const created: unknown[] = [];
    for (const vehicle of vehicles) {
      this.validateVehiclePayload(vehicle);
      const plate = this.normalizeAuctionVehiclePlate(vehicle);
      const createdVehicle = await this.auctionVehicleRepository.create({
        vehicleType: vehicle.vehicleType,
        make: vehicle.make,
        vehicleModel: vehicle.model,
        variant: vehicle.variant,
        vehicleNumber: plate || vehicle.vehicleNumber?.trim(),
        registrationNumber: plate,
        chassisLast5: vehicle.chassisLast5?.toUpperCase(),
        yearOfManufacture: vehicle.yearOfManufacture,
        color: vehicle.color,
        lotId: new Types.ObjectId(validatedLotId),
        auctionId: lot.auctionId,
        organizationId: new Types.ObjectId(orgId),
        createdBy: new Types.ObjectId(authenticatedUser.userId),
        updatedBy: new Types.ObjectId(authenticatedUser.userId),
      });
      created.push(createdVehicle);
    }
    await this.syncAuctionInvoiceMapping(lot.auctionId.toString(), orgId);
    return created;
  }

  async getVehiclesByLot(lotId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    return this.auctionVehicleRepository.findByLot(orgId, validatedLotId);
  }

  async updateVehicle(
    vehicleId: string,
    updateAuctionVehicleDto: UpdateAuctionVehicleDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
    const sanitized = sanitizeObject(
      updateAuctionVehicleDto,
    ) as UpdateAuctionVehicleDto;
    const existingVehicle = await this.auctionVehicleRepository.findById(validatedVehicleId);
    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    await this.assertAuctionEditable(existingVehicle.auctionId.toString(), orgId);
    const updated = await this.auctionVehicleRepository.updateById(validatedVehicleId, {
      ...sanitized,
      ...(sanitized.pickupDate ? { pickupDate: new Date(sanitized.pickupDate) } : {}),
      ...(sanitized.chassisLast5
        ? { chassisLast5: sanitized.chassisLast5.toUpperCase() }
        : {}),
      ...(sanitized.registrationNumber
        ? { registrationNumber: sanitized.registrationNumber.toUpperCase() }
        : {}),
      updatedBy: new Types.ObjectId(authenticatedUser.userId),
    });
    const vehicle = await this.auctionVehicleRepository.findById(validatedVehicleId);
    const auctionId = vehicle?.auctionId?.toString();
    if (auctionId) {
      await this.syncAuctionInvoiceMapping(auctionId, orgId);
    }
    return updated;
  }

  async deleteAuction(id: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const auctionId = validateObjectId(id, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    await this.assertAuctionEditable(auctionId, orgId);
    const linkedInvoice = await this.invoiceRepository.findOne({
      organizationId: new Types.ObjectId(orgId),
      sellerType: SellerType.MSTC,
      auctionId: new Types.ObjectId(auctionId),
      isDeleted: { $ne: true },
    });
    if (linkedInvoice) {
      throw new BadRequestException('Auction linked to invoice cannot be deleted');
    }
    const lots = await this.auctionLotRepository.findByAuction(orgId, auctionId);
    for (const lot of lots) {
      const vehicles = await this.auctionVehicleRepository.findByLot(
        orgId,
        lot._id.toString(),
      );
      for (const vehicle of vehicles) {
        await this.auctionVehicleRepository.deleteById(vehicle._id.toString());
      }
      await this.auctionLotRepository.deleteById(lot._id.toString());
    }
    await this.auctionRepository.deleteById(auctionId);
    return { message: 'Auction deleted successfully' };
  }

  async deleteLot(lotId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.auctionLotRepository.findByOrgAndId(orgId, validatedLotId);
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertAuctionEditable(lot.auctionId.toString(), orgId);
    const vehicles = await this.auctionVehicleRepository.findByLot(orgId, validatedLotId);
    for (const vehicle of vehicles) {
      await this.auctionVehicleRepository.deleteById(vehicle._id.toString());
    }
    await this.auctionLotRepository.deleteById(validatedLotId);
    await this.syncAuctionInvoiceMapping(lot.auctionId.toString(), orgId);
    return { message: 'Lot deleted successfully' };
  }

  async deleteVehicle(vehicleId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
    const vehicle = await this.auctionVehicleRepository.findById(validatedVehicleId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.assertAuctionEditable(vehicle.auctionId.toString(), orgId);
    await this.auctionVehicleRepository.deleteById(validatedVehicleId);
    await this.syncAuctionInvoiceMapping(vehicle.auctionId.toString(), orgId);
    return { message: 'Vehicle deleted successfully' };
  }

  async getLookup(authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const dealDoneLots = await this.auctionLotRepository.findAllByFilter({
      organizationId: new Types.ObjectId(orgId),
      outcomeStatus: LotOutcomeStatus.DEAL_DONE,
    });
    const auctionIds = [
      ...new Set(dealDoneLots.map((lot) => lot.auctionId.toString())),
    ];
    if (!auctionIds.length) return [];
    const auctions = await this.auctionRepository.findAllByFilter({
      organizationId: new Types.ObjectId(orgId),
      _id: { $in: auctionIds.map((id) => new Types.ObjectId(id)) },
      $or: [{ cancelledAt: { $exists: false } }, { cancelledAt: null }],
    });
    return auctions;
  }

  async getLookupById(auctionId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedAuctionId = validateObjectId(auctionId, 'Auction ID');
    const auction = await this.auctionRepository.findByOrgAndId(
      orgId,
      validatedAuctionId,
    );
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new BadRequestException('Cancelled auction cannot be invoiced');
    }
    const [lots, vehicles] = await Promise.all([
      this.auctionLotRepository.findByAuction(orgId, validatedAuctionId),
      this.auctionVehicleRepository.findByAuction(orgId, validatedAuctionId),
    ]);
    return {
      ...auction.toObject(),
      lots,
      vehicles,
      missingAuctionFields: this.getMissingAuctionFields(auction),
      totalVehicles: vehicles.length,
      totalAwardedAmount: lots.reduce(
        (acc, lot) => acc + (lot.awardedAmount || 0),
        0,
      ),
    };
  }

  async assertAuctionInvoiceAllowed(auctionId: string, orgId: string) {
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new BadRequestException('Cancelled auction cannot be invoiced');
    }
    const existingInvoice = await this.invoiceRepository.findOne({
      organizationId: new Types.ObjectId(orgId),
      sellerType: SellerType.MSTC,
      auctionId: new Types.ObjectId(auctionId),
      isDeleted: { $ne: true },
    });
    if (existingInvoice) {
      throw new BadRequestException('Invoice already exists for this auction');
    }
    return auction;
  }

  private async syncAuctionInvoiceMapping(auctionId: string, orgId: string) {
    const [lots, vehicles] = await Promise.all([
      this.auctionLotRepository.findByAuction(orgId, auctionId),
      this.auctionVehicleRepository.findByAuction(orgId, auctionId),
    ]);
    const lotIds = lots.map((lot) => lot._id);
    const vehicleIds = vehicles.map((vehicle) => vehicle._id);
    const lotNumber = lots.map((lot) => lot.lotNumber).filter(Boolean).join(', ');
    const purchaseAmount = lots.reduce(
      (acc, lot) => acc + (lot.awardedAmount || 0),
      0,
    );
    await this.invoiceRepository.updateManyByFilter(
      {
        organizationId: new Types.ObjectId(orgId),
        auctionId: new Types.ObjectId(auctionId),
        sellerType: SellerType.MSTC,
        isDeleted: { $ne: true },
      },
      {
        lotIds,
        vehicleIds,
        lotNumber,
        purchaseAmount,
        updatedAt: new Date(),
      },
    );
  }

  async uploadVehicleImages(
    vehicleId: string,
    files: Partial<Record<AuctionVehicleImageType, UploadFile[]>>,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
    const vehicle = await this.auctionVehicleRepository.findById(validatedVehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    await this.assertAuctionEditable(vehicle.auctionId.toString(), orgId);
    const keys: AuctionVehicleImageType[] = [
      'vehicleFront',
      'vehicleRight',
      'vehicleEngine',
      'vehicleLeft',
      'vehicleBack',
      'vehicleInterior',
    ];
    const uploadedDocuments: unknown[] = [];
    for (const key of keys) {
      const file = files[key]?.[0];
      if (!file) continue;
      assertSupportedDocumentFile(file);
      const upload = await this.storageService.uploadFile(
        file,
        `auction-vehicle-images/${orgId}/${vehicle.auctionId.toString()}/${vehicle.lotId.toString()}/${validatedVehicleId}`,
      );
      const doc = await this.auctionVehicleDocumentRepository.replaceDocument(
        validatedVehicleId,
        key,
        {
          vehicleId: new Types.ObjectId(validatedVehicleId),
          lotId: vehicle.lotId,
          auctionId: vehicle.auctionId,
          organizationId: new Types.ObjectId(orgId),
          uploadedBy: new Types.ObjectId(authenticatedUser.userId),
          documentType: key,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: upload.url,
          storageKey: upload.storageKey,
          provider: upload.provider,
        },
      );
      uploadedDocuments.push(doc);
    }
    return {
      message:
        uploadedDocuments.length > 0
          ? 'Vehicle images uploaded'
          : 'No vehicle images uploaded',
      documents: uploadedDocuments,
    };
  }

  async getVehicleImages(vehicleId: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const validatedVehicleId = validateObjectId(vehicleId, 'Vehicle ID');
    return this.auctionVehicleDocumentRepository.findByVehicle(
      validatedVehicleId,
      orgId,
    );
  }

  private getMissingAuctionFields(auction: {
    officers?: unknown[];
    auctionLocation?: string;
    vehicleLocation?: string;
    sellerName?: string;
    sellerMobileNumber?: string;
  }) {
    const missing: string[] = [];
    const officers = Array.isArray(auction.officers) ? auction.officers : [];
    if (!(auction.vehicleLocation || auction.auctionLocation))
      missing.push('vehicleLocation');
    if (!auction.sellerName) missing.push('sellerName');
    if (!auction.sellerMobileNumber) missing.push('sellerMobileNumber');
    if (officers.length === 0) missing.push('officers');
    return missing;
  }
}
