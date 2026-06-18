import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';
import {
  AuthorizationLetterStatus,
  AuthorizationLetterType,
} from 'src/common/enum/authorizationLetterStatus.enum';
import { AuctionRepository } from 'src/auction/auction.repository';
import { AuctionLotRepository } from 'src/auction/auction-lot.repository';
import { OrganizationLetterSettingsService } from 'src/organizations/organization-letter-settings.service';
import { StorageService } from 'src/common/services/storage.service';
import { AuthorizationLetterRepository } from './authorization-letter.repository';
import { AuthorizationLetterCounterRepository } from './authorization-letter-counter.repository';
import { CreateAuthorizationLetterDto } from './dto/create-authorization-letter.dto';
import { UpdateAuthorizationLetterDto } from './dto/update-authorization-letter.dto';
import { AuthorizationLetterLotSnapshot } from './authorization-letter.schema';
import type { AuctionLotDocument } from 'src/auction/auction-lot.schema';

@Injectable()
export class AuthorizationLetterService {
  private readonly templatePath = path.join(
    __dirname,
    'templates',
    'extension-lifting.hbs',
  );

  constructor(
    private readonly letterRepo: AuthorizationLetterRepository,
    private readonly counterRepo: AuthorizationLetterCounterRepository,
    private readonly auctionRepo: AuctionRepository,
    private readonly lotRepo: AuctionLotRepository,
    private readonly letterSettingsService: OrganizationLetterSettingsService,
    private readonly storageService: StorageService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return user.orgId;
  }

  private isLotEligible(lot: AuctionLotDocument): boolean {
    if (lot.outcomeStatus !== LotOutcomeStatus.DEAL_DONE) return true;
    return (
      lot.payment?.paymentStatus === LotPaymentStatus.PAID &&
      lot.delivery?.finalApprovalForLifting === true &&
      !!lot.delivery?.lastLiftingDate
    );
  }

  private getDealDoneLots(lots: AuctionLotDocument[]) {
    return lots.filter((lot) => lot.outcomeStatus === LotOutcomeStatus.DEAL_DONE);
  }

  isAuctionEligible(lots: AuctionLotDocument[]): boolean {
    const dealDoneLots = this.getDealDoneLots(lots);
    if (!dealDoneLots.length) return false;
    return dealDoneLots.every((lot) => this.isLotEligible(lot));
  }

  buildLotSnapshots(
    auctionNumber: string,
    lots: AuctionLotDocument[],
  ): AuthorizationLetterLotSnapshot[] {
    const dealDoneLots = this.getDealDoneLots(lots);
    const groups = new Map<string, AuctionLotDocument[]>();

    for (const lot of dealDoneLots) {
      const dateKey = lot.delivery!.lastLiftingDate!.toISOString().slice(0, 10);
      const existing = groups.get(dateKey) ?? [];
      existing.push(lot);
      groups.set(dateKey, existing);
    }

    const snapshots: AuthorizationLetterLotSnapshot[] = [];
    let lineIndex = 1;

    for (const [, groupLots] of [...groups.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const lotNumbers = groupLots
        .map((lot) => lot.lotNumber)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const lotNumberLabel = lotNumbers.join(' & ');
      const vehicleCount = groupLots.reduce((sum, lot) => sum + lot.vehicleCount, 0);
      const lastLiftingDate = groupLots[0].delivery!.lastLiftingDate!;
      const deliveryOrderNumber =
        groupLots.find((lot) => lot.delivery?.deliveryOrderNumber)?.delivery
          ?.deliveryOrderNumber ?? '';

      const formattedDate = this.formatDate(lastLiftingDate);
      snapshots.push({
        lotNumber: lotNumberLabel,
        deliveryOrderNumber,
        lastLiftingDate,
        vehicleCount,
        displayLabel: `${lineIndex}. Auction Ref. No. ${auctionNumber}, Lot No. ${lotNumberLabel}, Last Date of Lifting ${formattedDate}, Total Nos. ${vehicleCount}`,
      });
      lineIndex += 1;
    }

    return snapshots;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private buildRecipientAddress(auction: {
    auctionLocation?: string;
    city?: string;
    state?: string;
  }): string {
    return [auction.auctionLocation, auction.city, auction.state]
      .filter(Boolean)
      .join(', ');
  }

  async getEligibleAuctions(user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    const auctions = await this.auctionRepo.findAllByFilter({
      organizationId: new Types.ObjectId(orgId),
    });
    const existingLetters = await this.letterRepo.findAllByOrg(orgId);
    const letterAuctionIds = new Set(
      existingLetters.map((letter) => letter.auctionId.toString()),
    );

    const eligible: Array<{
      _id: Types.ObjectId;
      auctionNumber: string;
      auctionDate: Date;
      sellerName?: string;
      sellerEntityName?: string;
      buyerReferenceNumber?: string;
      auctionLocation?: string;
      city?: string;
      state?: string;
      vehicleLocation?: string;
      lotCount: number;
    }> = [];
    for (const auction of auctions) {
      if (letterAuctionIds.has(auction._id.toString())) continue;
      const lots = await this.lotRepo.findByAuction(
        orgId,
        auction._id.toString(),
      );
      if (!this.isAuctionEligible(lots)) continue;
      eligible.push({
        _id: auction._id,
        auctionNumber: auction.auctionNumber,
        auctionDate: auction.auctionDate,
        sellerName: auction.sellerName,
        sellerEntityName: auction.sellerEntityName,
        buyerReferenceNumber: auction.buyerReferenceNumber,
        auctionLocation: auction.auctionLocation,
        city: auction.city,
        state: auction.state,
        vehicleLocation: auction.vehicleLocation,
        lotCount: this.getDealDoneLots(lots).length,
      });
    }
    return eligible;
  }

  async getEligibilityForAuction(user: AuthenticatedUser, auctionId: string) {
    const orgId = this.getOrgId(user);
    const validatedAuctionId = validateObjectId(auctionId, 'Auction ID');
    const existing = await this.letterRepo.findByAuctionId(orgId, validatedAuctionId);
    if (existing) {
      return {
        status: 'CREATED',
        letterId: existing._id,
        letterNumber: existing.letterNumber,
      };
    }
    const auction = await this.auctionRepo.findByOrgAndId(orgId, validatedAuctionId);
    if (!auction) throw new NotFoundException('Auction not found');
    const lots = await this.lotRepo.findByAuction(orgId, validatedAuctionId);
    const eligible = this.isAuctionEligible(lots);
    return {
      status: eligible ? 'READY' : 'NOT_ELIGIBLE',
      letterId: null,
      letterNumber: null,
    };
  }

  async list(user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    const letters = await this.letterRepo.findAllByOrg(orgId);
    return letters.sort((a, b) => {
      const aTime = new Date((a as { createdAt?: Date }).createdAt ?? 0).getTime();
      const bTime = new Date((b as { createdAt?: Date }).createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');
    return letter;
  }

  async create(user: AuthenticatedUser, dto: CreateAuthorizationLetterDto) {
    const orgId = this.getOrgId(user);
    const auctionId = validateObjectId(dto.auctionId, 'Auction ID');
    const existing = await this.letterRepo.findByAuctionId(orgId, auctionId);
    if (existing) {
      throw new ConflictException(
        'An authorization letter already exists for this auction',
      );
    }

    const auction = await this.auctionRepo.findByOrgAndId(orgId, auctionId);
    if (!auction) throw new NotFoundException('Auction not found');

    const lots = await this.lotRepo.findByAuction(orgId, auctionId);
    if (!this.isAuctionEligible(lots)) {
      throw new BadRequestException(
        'Auction is not eligible for authorization letter',
      );
    }

    const overrides = dto.recipientOverrides ?? {};
    const recipientName =
      overrides.recipientName?.trim() ||
      auction.sellerEntityName?.trim() ||
      auction.sellerName?.trim() ||
      '';
    const recipientAddress =
      overrides.recipientAddress?.trim() ||
      this.buildRecipientAddress(auction);
    const recipientPinCode = overrides.recipientPinCode?.trim() || '';
    const buyerReferenceNumber =
      overrides.buyerReferenceNumber?.trim() ||
      auction.buyerReferenceNumber?.trim() ||
      '';

    if (!recipientName) {
      throw new BadRequestException('Recipient name is required');
    }
    if (!recipientAddress) {
      throw new BadRequestException('Recipient address is required');
    }

    const letterNumber = await this.counterRepo.getNextLetterNumber();
    const lotSnapshots = this.buildLotSnapshots(auction.auctionNumber, lots);

    return this.letterRepo.create({
      organizationId: new Types.ObjectId(orgId),
      auctionId: new Types.ObjectId(auctionId),
      letterNumber,
      status: AuthorizationLetterStatus.DRAFT,
      letterType: AuthorizationLetterType.EXTENSION_LIFTING,
      buyerReferenceNumber,
      recipientName,
      recipientAddress,
      recipientPinCode,
      extensionDays: dto.extensionDays,
      auctionNumber: auction.auctionNumber,
      lotSnapshots,
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateAuthorizationLetterDto,
  ) {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');
    if (letter.status !== AuthorizationLetterStatus.DRAFT) {
      throw new BadRequestException('Only draft letters can be edited');
    }
    const sanitized = sanitizeObject(dto) as UpdateAuthorizationLetterDto;
    return this.letterRepo.updateById(letterId, {
      ...sanitized,
      updatedBy: new Types.ObjectId(user.userId),
    });
  }

  async delete(user: AuthenticatedUser, id: string) {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');
    if (letter.status !== AuthorizationLetterStatus.DRAFT) {
      throw new BadRequestException('Only draft letters can be deleted');
    }
    await this.letterRepo.deleteById(letterId);
    return { message: 'Authorization letter deleted' };
  }

  private async buildTemplateContext(letterId: string, orgId: string) {
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');
    const settings = await this.letterSettingsService.getByOrganizationId(orgId);
    const today = this.formatDate(new Date());
    const buyerRefLabel = settings.buyerRefLabel || 'MSTC BUYER REF. NO.';
    const buyerRefDisplay = letter.buyerReferenceNumber
      ? `${buyerRefLabel}${letter.buyerReferenceNumber}`
      : buyerRefLabel;

    return {
      settings,
      letter,
      today,
      buyerRefDisplay,
      lotLines: letter.lotSnapshots.map((snap) => snap.displayLabel),
      mobileDisplay: (settings.mobileNumbers ?? []).join(' / '),
      extensionDays: letter.extensionDays,
    };
  }

  async renderHtml(user: AuthenticatedUser, id: string): Promise<string> {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const context = await this.buildTemplateContext(letterId, orgId);
    const templateSource = fs.readFileSync(this.templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    return template(context);
  }

  async generatePdf(user: AuthenticatedUser, id: string): Promise<Buffer> {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');

    const html = await this.renderHtml(user, id);
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      });

      const upload = await this.storageService.uploadFile(
        {
          originalname: `${letter.letterNumber}.pdf`,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
          buffer: Buffer.from(pdfBuffer),
        },
        `authorization-letters/${orgId}`,
      );

      await this.letterRepo.updateById(letterId, {
        status: AuthorizationLetterStatus.GENERATED,
        generatedPdfUrl: upload.url,
        generatedAt: new Date(),
        updatedBy: new Types.ObjectId(user.userId),
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
