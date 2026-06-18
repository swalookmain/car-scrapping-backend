import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';
import { LotLifecycleEventType } from 'src/common/enum/lotLifecycleEventType.enum';
import { NotificationEntityType } from 'src/common/enum/notificationEntityType.enum';
import { ReminderType } from 'src/common/enum/reminderType.enum';
import { NotificationService } from 'src/notification/services/notification.service';
import { StorageService } from 'src/common/services/storage.service';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { AuctionRepository } from '../auction.repository';
import { AuctionLotRepository } from '../auction-lot.repository';
import { AuctionLotDocument } from '../auction-lot.schema';
import { UpdateLotOutcomeBatchDto } from './dto/update-lot-outcome.dto';
import { CreateLotPaymentDto } from './dto/create-lot-payment.dto';
import { UpdateAcceptanceLetterDto } from './dto/update-acceptance-letter.dto';
import { UpdateLotDeliveryDto } from './dto/update-lot-delivery.dto';
import { UpdateLotRcmDto } from './dto/update-lot-rcm.dto';
import { LifecycleStateService } from './lifecycle-state.service';
import { LotPaymentRecordRepository } from './repositories/lot-payment-record.repository';
import { LotLifecycleEventRepository } from './repositories/lot-lifecycle-event.repository';
import { LotDocumentRepository } from './repositories/lot-document.repository';

@Injectable()
export class LifecycleService {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly auctionLotRepository: AuctionLotRepository,
    private readonly lifecycleStateService: LifecycleStateService,
    private readonly lotPaymentRecordRepository: LotPaymentRecordRepository,
    private readonly lotLifecycleEventRepository: LotLifecycleEventRepository,
    private readonly lotDocumentRepository: LotDocumentRepository,
    private readonly notificationService: NotificationService,
    private readonly storageService: StorageService,
  ) {}

  private getOrgId(user: AuthenticatedUser) {
    if (!user.orgId) throw new BadRequestException('Organization not found');
    return user.orgId;
  }

  private normalizeOfficers(officers: unknown) {
    const list = Array.isArray(officers) ? officers : [];
    return list
      .filter((o) => o && typeof o === 'object')
      .map((o) => {
        const typed = o as Record<string, unknown>;
        return {
          name: typeof typed.name === 'string' ? typed.name.trim() : '',
          email: typeof typed.email === 'string' ? typed.email.trim() : undefined,
          phoneNumber:
            typeof typed.phoneNumber === 'string'
              ? typed.phoneNumber.replace(/\D/g, '')
              : undefined,
          officerType:
            typeof typed.officerType === 'string'
              ? typed.officerType.trim().toUpperCase()
              : undefined,
        };
      })
      .filter((o) => o.name);
  }

  private async getAuctionOrThrow(orgId: string, auctionId: string) {
    const auction = await this.auctionRepository.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    return auction;
  }

  private async getLotOrThrow(orgId: string, lotId: string) {
    const lot = await this.auctionLotRepository.findByOrgAndId(orgId, lotId);
    if (!lot) throw new NotFoundException('Lot not found');
    return lot;
  }

  private resolveRecipientPhone(auction: { sellerMobileNumber?: string; officers?: unknown }) {
    if (auction.sellerMobileNumber) return auction.sellerMobileNumber.replace(/\D/g, '');
    const officers = this.normalizeOfficers(auction.officers);
    const withPhone = officers.find((o) => o.phoneNumber?.length === 10);
    return withPhone?.phoneNumber;
  }

  private async recordEvent(
    orgId: string,
    auctionId: string,
    lotId: string,
    eventType: LotLifecycleEventType,
    userId: string,
    payload?: Record<string, unknown>,
    fromOutcome?: LotOutcomeStatus,
    toOutcome?: LotOutcomeStatus,
  ) {
    await this.lotLifecycleEventRepository.create({
      organizationId: new Types.ObjectId(orgId),
      auctionId: new Types.ObjectId(auctionId),
      lotId: new Types.ObjectId(lotId),
      eventType,
      fromOutcome,
      toOutcome,
      payload,
      performedBy: new Types.ObjectId(userId),
    });
  }

  private mapLotForResponse(
    lot: AuctionLotDocument,
    payments: unknown[] = [],
    gatePassDocumentUrl?: string,
    locked = false,
  ) {
    const obj = lot.toObject();
    return {
      ...obj,
      locked,
      editable: this.lifecycleStateService.isLotOutcomeEditable(lot.outcomeStatus),
      payments,
      gatePassDocumentUrl,
    };
  }

  async getLifecycle(auctionId: string, user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    const validatedId = validateObjectId(auctionId, 'Auction ID');
    const auction = await this.getAuctionOrThrow(orgId, validatedId);
    const lots = await this.auctionLotRepository.findByAuction(orgId, validatedId);

    const lotsWithDetails = await Promise.all(
      lots.map(async (lot) => {
        const lotId = lot._id.toString();
        const payments = await this.lotPaymentRecordRepository.findByLot(orgId, lotId);
        let gatePassDocumentUrl: string | undefined;
        if (lot.gatePass?.documentId) {
          const doc = await this.lotDocumentRepository.findById(
            lot.gatePass.documentId.toString(),
          );
          gatePassDocumentUrl = doc?.url;
        }
        const locked = !this.lifecycleStateService.isLotOutcomeEditable(lot.outcomeStatus);
        return this.mapLotForResponse(lot, payments, gatePassDocumentUrl, locked);
      }),
    );

    const auctionSummary = this.lifecycleStateService.deriveAuctionSummary(lots);
    const availableActions = this.lifecycleStateService.deriveAvailableActions(
      lots,
      !!auction.cancelledAt,
    );

    return {
      auction: auction.toObject(),
      lots: lotsWithDetails,
      auctionSummary,
      availableActions,
    };
  }

  async updateOutcome(
    auctionId: string,
    dto: UpdateLotOutcomeBatchDto,
    user: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(user);
    const validatedId = validateObjectId(auctionId, 'Auction ID');
    const auction = await this.getAuctionOrThrow(orgId, validatedId);
    if (auction.cancelledAt) {
      throw new BadRequestException('Cancelled auction cannot be updated');
    }

    const sanitized = sanitizeObject(dto) as UpdateLotOutcomeBatchDto;
    const userId = user.userId;

    for (const item of sanitized.lots) {
      const lotId = validateObjectId(item.lotId, 'Lot ID');
      const lot = await this.getLotOrThrow(orgId, lotId);
      if (lot.auctionId.toString() !== validatedId) {
        throw new BadRequestException('Lot does not belong to this auction');
      }
      if (!this.lifecycleStateService.isLotOutcomeEditable(lot.outcomeStatus)) {
        throw new BadRequestException(
          `Lot ${lot.lotNumber} outcome is locked and cannot be changed`,
        );
      }

      const fromOutcome = lot.outcomeStatus;
      const toOutcome = item.outcomeStatus;
      const update: Record<string, unknown> = {
        outcomeStatus: toOutcome,
        updatedBy: new Types.ObjectId(userId),
      };

      if (toOutcome === LotOutcomeStatus.DEAL_DONE) {
        if (!item.totalAmount && item.totalAmount !== 0) {
          throw new BadRequestException(
            `Total amount is required for lot ${lot.lotNumber}`,
          );
        }
        if (!item.dealClosedAt) {
          throw new BadRequestException(
            `Closing date/time is required for lot ${lot.lotNumber}`,
          );
        }
        const preEmd =
          item.preEmdAmount ?? lot.preEmdAmount ?? lot.deal?.preEmdAmount ?? 0;
        if (item.totalAmount < preEmd) {
          throw new BadRequestException(
            `Total amount must be >= pre-EMD for lot ${lot.lotNumber}`,
          );
        }
        const balanceAmount = this.lifecycleStateService.computeBalance(
          item.totalAmount,
          preEmd,
        );
        const paymentDueDate = item.paymentDueDate
          ? new Date(item.paymentDueDate)
          : this.lifecycleStateService.defaultPaymentDueDate();

        update.deal = {
          totalAmount: item.totalAmount,
          preEmdAmount: preEmd,
          balanceAmount,
          dealClosedAt: new Date(item.dealClosedAt),
          paymentDueDate,
        };
        update.preEmdAmount = preEmd;
        update.payment = {
          paymentStatus: LotPaymentStatus.NOT_PAID,
          amountPaidTotal: 0,
          amountLeft: balanceAmount,
        };

        const phone = this.resolveRecipientPhone(auction);
        if (phone) {
          await this.notificationService.scheduleReminder({
            organizationId: orgId,
            entityType: NotificationEntityType.LOT,
            entityId: lotId,
            auctionId: validatedId,
            reminderType: ReminderType.PAYMENT,
            recipientPhone: phone,
            amount: balanceAmount,
            dueDate: paymentDueDate,
            auctionNumber: auction.auctionNumber,
            lotNumber: lot.lotNumber,
          });
        }
      }

      await this.auctionLotRepository.updateById(lotId, update);
      await this.recordEvent(
        orgId,
        validatedId,
        lotId,
        LotLifecycleEventType.OUTCOME_CHANGED,
        userId,
        { deal: update.deal },
        fromOutcome,
        toOutcome,
      );
    }

    return this.getLifecycle(validatedId, user);
  }

  async recordPayment(
    lotId: string,
    dto: CreateLotPaymentDto,
    user: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(user);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.getLotOrThrow(orgId, validatedLotId);

    if (lot.outcomeStatus !== LotOutcomeStatus.DEAL_DONE) {
      throw new BadRequestException('Payments can only be recorded for deal-done lots');
    }
    const balanceAmount = lot.deal?.balanceAmount ?? 0;
    const currentPaid = lot.payment?.amountPaidTotal ?? 0;
    const sanitized = sanitizeObject(dto) as CreateLotPaymentDto;

    if (currentPaid + sanitized.amountPaid > balanceAmount) {
      throw new BadRequestException('Payment exceeds outstanding balance');
    }

    await this.lotPaymentRecordRepository.create({
      organizationId: new Types.ObjectId(orgId),
      auctionId: lot.auctionId,
      lotId: new Types.ObjectId(validatedLotId),
      amountPaid: sanitized.amountPaid,
      transactionNumber: sanitized.transactionNumber,
      bank: sanitized.bank,
      transferDate: sanitized.transferDate ? new Date(sanitized.transferDate) : undefined,
      remark: sanitized.remark,
      recordedBy: new Types.ObjectId(user.userId),
    });

    const newPaidTotal = currentPaid + sanitized.amountPaid;
    const { paymentStatus, amountLeft } = this.lifecycleStateService.computePaymentStatus(
      balanceAmount,
      newPaidTotal,
    );

    await this.auctionLotRepository.updateById(validatedLotId, {
      payment: {
        paymentStatus,
        amountPaidTotal: newPaidTotal,
        amountLeft,
      },
      updatedBy: new Types.ObjectId(user.userId),
    });

    if (paymentStatus === LotPaymentStatus.PAID) {
      await this.notificationService.completeReminder(validatedLotId, ReminderType.PAYMENT);
    }

    await this.recordEvent(
      orgId,
      lot.auctionId.toString(),
      validatedLotId,
      LotLifecycleEventType.PAYMENT_RECORDED,
      user.userId,
      { amountPaid: sanitized.amountPaid, amountLeft },
    );

    return this.getLifecycle(lot.auctionId.toString(), user);
  }

  async updateAcceptanceLetter(
    lotId: string,
    dto: UpdateAcceptanceLetterDto,
    user: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(user);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.getLotOrThrow(orgId, validatedLotId);

    if (lot.payment?.paymentStatus !== LotPaymentStatus.PAID) {
      throw new BadRequestException('Acceptance letter can only be updated when fully paid');
    }

    const sanitized = sanitizeObject(dto) as UpdateAcceptanceLetterDto;
    if (sanitized.received) {
      if (!sanitized.letterNumber || !sanitized.receivedDate) {
        throw new BadRequestException('Letter number and received date are required');
      }
    }

    await this.auctionLotRepository.updateById(validatedLotId, {
      acceptanceLetter: {
        received: sanitized.received,
        letterNumber: sanitized.letterNumber,
        receivedDate: sanitized.receivedDate
          ? new Date(sanitized.receivedDate)
          : undefined,
      },
      updatedBy: new Types.ObjectId(user.userId),
    });

    await this.recordEvent(
      orgId,
      lot.auctionId.toString(),
      validatedLotId,
      LotLifecycleEventType.ACCEPTANCE_LETTER_UPDATED,
      user.userId,
      sanitized as unknown as Record<string, unknown>,
    );

    return this.getLifecycle(lot.auctionId.toString(), user);
  }

  async updateDelivery(
    lotId: string,
    dto: UpdateLotDeliveryDto,
    user: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(user);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.getLotOrThrow(orgId, validatedLotId);
    const auction = await this.getAuctionOrThrow(orgId, lot.auctionId.toString());

    if (lot.payment?.paymentStatus !== LotPaymentStatus.PAID) {
      throw new BadRequestException('Delivery can only be updated when payment is complete');
    }

    const sanitized = sanitizeObject(dto) as UpdateLotDeliveryDto;
    if (sanitized.lastLiftingDate) {
      try {
        this.lifecycleStateService.assertFutureDate(
          sanitized.lastLiftingDate,
          'Last lifting date',
        );
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Invalid lifting date',
        );
      }
    }

    const existingDelivery = lot.delivery || {
      officers: [],
      finalApprovalForLifting: false,
      liftingReminderActive: false,
    };
    const officers = sanitized.officers
      ? this.normalizeOfficers(sanitized.officers)
      : existingDelivery.officers?.length
        ? existingDelivery.officers
        : this.normalizeOfficers(auction.officers);

    const finalApproval =
      sanitized.finalApprovalForLifting ?? existingDelivery.finalApprovalForLifting;

    const delivery = {
      deliveryOrderNumber:
        sanitized.deliveryOrderNumber ?? existingDelivery.deliveryOrderNumber,
      lastLiftingDate: sanitized.lastLiftingDate
        ? new Date(sanitized.lastLiftingDate)
        : existingDelivery.lastLiftingDate,
      officers,
      finalApprovalForLifting: finalApproval,
      liftingReminderActive: finalApproval,
    };

    await this.auctionLotRepository.updateById(validatedLotId, {
      delivery,
      updatedBy: new Types.ObjectId(user.userId),
    });

    if (finalApproval && delivery.lastLiftingDate) {
      const phone = this.resolveRecipientPhone(auction);
      if (phone) {
        await this.notificationService.scheduleReminder({
          organizationId: orgId,
          entityType: NotificationEntityType.LOT,
          entityId: validatedLotId,
          auctionId: lot.auctionId.toString(),
          reminderType: ReminderType.LIFTING,
          recipientPhone: phone,
          dueDate: delivery.lastLiftingDate,
          auctionNumber: auction.auctionNumber,
          lotNumber: lot.lotNumber,
          deliveryOrderNumber: delivery.deliveryOrderNumber,
        });
      }
    }

    await this.recordEvent(
      orgId,
      lot.auctionId.toString(),
      validatedLotId,
      LotLifecycleEventType.DELIVERY_UPDATED,
      user.userId,
      delivery as unknown as Record<string, unknown>,
    );

    return this.getLifecycle(lot.auctionId.toString(), user);
  }

  async uploadGatePass(
    lotId: string,
    gatePassDate: string,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(user);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.getLotOrThrow(orgId, validatedLotId);

    if (lot.payment?.paymentStatus !== LotPaymentStatus.PAID) {
      throw new BadRequestException('Gate pass can only be added when payment is complete');
    }
    if (!gatePassDate) {
      throw new BadRequestException('Gate pass date is required');
    }

    let documentId = lot.gatePass?.documentId;
    if (file) {
      assertSupportedDocumentFile(file);
      const upload = await this.storageService.uploadFile(
        file,
        `auctions/${lot.auctionId}/lots/${validatedLotId}/gate-pass`,
      );
      const doc = await this.lotDocumentRepository.create({
        organizationId: new Types.ObjectId(orgId),
        auctionId: lot.auctionId,
        lotId: new Types.ObjectId(validatedLotId),
        documentType: 'GATE_PASS',
        url: upload.url,
        storageKey: upload.storageKey,
        provider: upload.provider,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: new Types.ObjectId(user.userId),
      });
      documentId = doc._id;
    } else if (!documentId) {
      throw new BadRequestException('Gate pass file is required');
    }

    await this.auctionLotRepository.updateById(validatedLotId, {
      gatePass: {
        gatePassDate: new Date(gatePassDate),
        documentId,
      },
      updatedBy: new Types.ObjectId(user.userId),
    });

    await this.recordEvent(
      orgId,
      lot.auctionId.toString(),
      validatedLotId,
      LotLifecycleEventType.GATE_PASS_UPLOADED,
      user.userId,
      { gatePassDate, documentId: documentId?.toString() },
    );

    return this.getLifecycle(lot.auctionId.toString(), user);
  }

  async updateRcm(lotId: string, dto: UpdateLotRcmDto, user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    const validatedLotId = validateObjectId(lotId, 'Lot ID');
    const lot = await this.getLotOrThrow(orgId, validatedLotId);

    if (lot.outcomeStatus !== LotOutcomeStatus.DEAL_DONE) {
      throw new BadRequestException('RCM details can only be added for deal-done lots');
    }

    const sanitized = sanitizeObject(dto) as UpdateLotRcmDto;
    const rcm = {
      challanNumber: sanitized.challanNumber,
      transactionDate: sanitized.transactionDate
        ? new Date(sanitized.transactionDate)
        : undefined,
      amount: sanitized.amount,
    };

    await this.auctionLotRepository.updateById(validatedLotId, {
      rcm,
      updatedBy: new Types.ObjectId(user.userId),
    });

    await this.recordEvent(
      orgId,
      lot.auctionId.toString(),
      validatedLotId,
      LotLifecycleEventType.RCM_UPDATED,
      user.userId,
      rcm as unknown as Record<string, unknown>,
    );

    return this.getLifecycle(lot.auctionId.toString(), user);
  }
}
