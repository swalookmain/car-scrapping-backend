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
import { isStaffUser, staffObjectId } from 'src/common/access/data-scope';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { utcDateWindow } from 'src/common/utils/date-range.util';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';
import {
  AuthorizationLetterStatus,
  AuthorizationLetterType,
} from 'src/common/enum/authorizationLetterStatus.enum';
import { AuctionRepository } from 'src/auction/auction.repository';
import { AuctionLotRepository } from 'src/auction/auction-lot.repository';
import { AuctionVehicleRepository } from 'src/auction/auction-vehicle.repository';
import { OrganizationLetterSettingsService } from 'src/organizations/organization-letter-settings.service';
import { StorageService } from 'src/common/services/storage.service';
import { AuthorizationLetterRepository } from './authorization-letter.repository';
import { AuthorizationLetterCounterRepository } from './authorization-letter-counter.repository';
import { CreateAuthorizationLetterDto } from './dto/create-authorization-letter.dto';
import { UpdateAuthorizationLetterDto } from './dto/update-authorization-letter.dto';
import { AuthorizationLetterLotSnapshot } from './authorization-letter.schema';
import type { AuctionLotDocument } from 'src/auction/auction-lot.schema';
import type { AuctionDocument } from 'src/auction/auction.schema';

@Injectable()
export class AuthorizationLetterService {
  private readonly templatePath = path.join(
    __dirname,
    'templates',
    'authorization-delivery.hbs',
  );

  constructor(
    private readonly letterRepo: AuthorizationLetterRepository,
    private readonly counterRepo: AuthorizationLetterCounterRepository,
    private readonly auctionRepo: AuctionRepository,
    private readonly lotRepo: AuctionLotRepository,
    private readonly auctionVehicleRepo: AuctionVehicleRepository,
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

  async buildLotSnapshots(
    orgId: string,
    auction: AuctionDocument,
    lots: AuctionLotDocument[],
  ): Promise<AuthorizationLetterLotSnapshot[]> {
    const dealDoneLots = this.getDealDoneLots(lots);
    const auctionId = auction._id.toString();
    const vehicles = await this.auctionVehicleRepo.findByAuction(
      orgId,
      auctionId,
    );
    const vehiclesByLot = new Map<string, typeof vehicles>();
    for (const vehicle of vehicles) {
      const lotKey = vehicle.lotId?.toString();
      if (!lotKey) continue;
      const list = vehiclesByLot.get(lotKey) || [];
      list.push(vehicle);
      vehiclesByLot.set(lotKey, list);
    }

    const liftingDistrict = auction.city || auction.vehicleLocation || '';
    const liftingState = auction.state || '';
    const auctionDetails = auction.auctionNumber || '';

    const snapshots: AuthorizationLetterLotSnapshot[] = [];
    const sortedLots = [...dealDoneLots].sort((a, b) =>
      String(a.lotNumber).localeCompare(String(b.lotNumber), undefined, {
        numeric: true,
      }),
    );

    for (const lot of sortedLots) {
      const lotVehicles = vehiclesByLot.get(lot._id.toString()) || [];
      const elvDetails = lotVehicles
        .map(
          (v) =>
            (v.registrationNumber || v.vehicleNumber || '').trim().toUpperCase(),
        )
        .filter(Boolean)
        .join(', ');

      const lastLiftingDate = lot.delivery?.lastLiftingDate;
      const datesOfLifting = lastLiftingDate
        ? this.formatDate(lastLiftingDate)
        : lot.pickupWindowStart && lot.pickupWindowEnd
          ? `${this.formatDate(lot.pickupWindowStart)} - ${this.formatDate(lot.pickupWindowEnd)}`
          : lot.pickupWindowEnd
            ? this.formatDate(lot.pickupWindowEnd)
            : '';

      const description =
        lot.lotDescription?.trim() ||
        `${String(lot.vehicleCount).padStart(2, '0')} ELV`;

      const deliveryOrderNumber = lot.delivery?.deliveryOrderNumber ?? '';

      snapshots.push({
        lotNumber: lot.lotNumber,
        deliveryOrderNumber,
        lastLiftingDate,
        vehicleCount: lot.vehicleCount,
        auctionDetails,
        description,
        datesOfLifting,
        liftingDistrict,
        liftingState,
        elvDetails,
        displayLabel: [
          `Auction Details: ${auctionDetails}`,
          `Lot No.: ${lot.lotNumber}`,
          `Description: ${description}`,
          datesOfLifting ? `Dates of Lifting: ${datesOfLifting}` : null,
          `Lifting location: District: ${liftingDistrict} State: ${liftingState}`,
          elvDetails ? `ELV DETAILS: ${elvDetails}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      });
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
      ...(isStaffUser(user) ? { createdBy: staffObjectId(user) } : {}),
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
    this.assertStaffOwnsAuction(auction, user);
    const lots = await this.lotRepo.findByAuction(orgId, validatedAuctionId);
    const eligible = this.isAuctionEligible(lots);
    return {
      status: eligible ? 'READY' : 'NOT_ELIGIBLE',
      letterId: null,
      letterNumber: null,
    };
  }

  async list(user: AuthenticatedUser, fromDate?: string, toDate?: string) {
    const orgId = this.getOrgId(user);
    let letters = await this.letterRepo.findAllByOrg(orgId);
    if (isStaffUser(user)) {
      const ownedAuctionIds = await this.staffAuctionIds(user);
      letters = letters.filter(
        (letter) =>
          ownedAuctionIds.has(letter.auctionId.toString()) ||
          letter.createdBy?.toString() === user.userId,
      );
    }
    const window = utcDateWindow(fromDate, toDate);
    if (window) {
      letters = letters.filter((letter) => {
        const created = new Date((letter as { createdAt?: Date }).createdAt ?? 0);
        if (window.$gte && created < window.$gte) return false;
        if (window.$lt && created >= window.$lt) return false;
        return true;
      });
    }
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
    await this.assertStaffOwnsLetter(letter, user);
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
    this.assertStaffOwnsAuction(auction, user);

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
    const authorizedPersonName = dto.authorizedPersonName?.trim() || '';
    const authorizedPersonIdProof = dto.authorizedPersonIdProof?.trim() || '';

    if (!recipientName) {
      throw new BadRequestException('Recipient name is required');
    }
    if (!recipientAddress) {
      throw new BadRequestException('Recipient address is required');
    }
    if (!authorizedPersonName) {
      throw new BadRequestException('Authorized person name is required');
    }
    if (!authorizedPersonIdProof) {
      throw new BadRequestException('Authorized person ID proof is required');
    }

    const letterDate = dto.letterDate
      ? new Date(dto.letterDate)
      : new Date();
    if (Number.isNaN(letterDate.getTime())) {
      throw new BadRequestException('Invalid letter date');
    }

    const letterNumber = await this.counterRepo.getNextLetterNumber();
    const lotSnapshots = await this.buildLotSnapshots(orgId, auction, lots);

    return this.letterRepo.create({
      organizationId: new Types.ObjectId(orgId),
      auctionId: new Types.ObjectId(auctionId),
      letterNumber,
      status: AuthorizationLetterStatus.DRAFT,
      letterType: AuthorizationLetterType.AUTHORIZATION_DELIVERY,
      buyerReferenceNumber,
      recipientName,
      recipientAddress,
      recipientPinCode,
      authorizedPersonName,
      authorizedPersonIdProof,
      letterDate,
      extensionDays: dto.extensionDays ?? 1,
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
    await this.assertStaffOwnsLetter(letter, user);
    if (letter.status !== AuthorizationLetterStatus.DRAFT) {
      throw new BadRequestException('Only draft letters can be edited');
    }
    const sanitized = sanitizeObject(dto) as UpdateAuthorizationLetterDto;
    const patch: Record<string, unknown> = {
      ...sanitized,
      updatedBy: new Types.ObjectId(user.userId),
    };
    if (sanitized.letterDate) {
      const letterDate = new Date(sanitized.letterDate);
      if (Number.isNaN(letterDate.getTime())) {
        throw new BadRequestException('Invalid letter date');
      }
      patch.letterDate = letterDate;
    }
    return this.letterRepo.updateById(letterId, patch);
  }

  async delete(user: AuthenticatedUser, id: string) {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.letterRepo.findByOrgAndId(orgId, letterId);
    if (!letter) throw new NotFoundException('Authorization letter not found');
    await this.assertStaffOwnsLetter(letter, user);
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
    const letterDateSource = letter.letterDate || new Date();
    const letterDate = this.formatDate(letterDateSource);
    const buyerRefLabel = settings.buyerRefLabel || 'MSTC BUYER REF. NO.';
    const buyerRefDisplay = letter.buyerReferenceNumber
      ? `${buyerRefLabel} ${letter.buyerReferenceNumber}`
      : buyerRefLabel;

    const lotDetails = (letter.lotSnapshots || []).map((snap) => ({
      auctionDetails: snap.auctionDetails || letter.auctionNumber || '',
      lotNumber: snap.lotNumber || '',
      description: snap.description || '',
      datesOfLifting: snap.datesOfLifting
        || (snap.lastLiftingDate ? this.formatDate(snap.lastLiftingDate) : ''),
      liftingDistrict: snap.liftingDistrict || '',
      liftingState: snap.liftingState || '',
      elvDetails: snap.elvDetails || '',
    }));

    return {
      settings,
      letter,
      letterDate,
      today: letterDate,
      buyerRefDisplay,
      lotDetails,
      lotLines: letter.lotSnapshots.map((snap) => snap.displayLabel),
      mobileDisplay: (settings.mobileNumbers ?? []).join(' / '),
      extensionDays: letter.extensionDays,
    };
  }

  async renderHtml(user: AuthenticatedUser, id: string): Promise<string> {
    await this.getById(user, id);
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const context = await this.buildTemplateContext(letterId, orgId);
    const templateSource = fs.readFileSync(this.templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    return template(context);
  }

  private assertStaffOwnsAuction(
    auction: { createdBy?: { toString(): string } },
    user: AuthenticatedUser,
  ) {
    if (isStaffUser(user) && auction.createdBy?.toString() !== user.userId) {
      throw new NotFoundException('Auction not found');
    }
  }

  private async staffAuctionIds(user: AuthenticatedUser) {
    const auctions = await this.auctionRepo.findAllByFilter({
      organizationId: new Types.ObjectId(this.getOrgId(user)),
      createdBy: staffObjectId(user),
    });
    return new Set(auctions.map((auction) => auction._id.toString()));
  }

  private async assertStaffOwnsLetter(
    letter: { createdBy?: { toString(): string }; auctionId: { toString(): string } },
    user: AuthenticatedUser,
  ) {
    if (!isStaffUser(user)) return;
    if (letter.createdBy?.toString() === user.userId) return;
    const ownedAuctionIds = await this.staffAuctionIds(user);
    if (ownedAuctionIds.has(letter.auctionId.toString())) return;
    throw new NotFoundException('Authorization letter not found');
  }

  async generatePdf(user: AuthenticatedUser, id: string): Promise<Buffer> {
    const orgId = this.getOrgId(user);
    const letterId = validateObjectId(id, 'Letter ID');
    const letter = await this.getById(user, id);

    const html = await this.renderHtml(user, id);
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
      // Wait until letter-settings logos / stamp / signature have loaded (or errored)
      await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map(
            (img) =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                  }),
          ),
        );
      });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Equal margin on all four corners
        margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
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
