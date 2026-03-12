import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { GstAuditEventType } from 'src/common/enum/gstAuditEventType.enum';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';
import { TaxConfigRepository } from './tax-config.repository';
import { EwayBillRecordRepository } from './eway-bill-record.repository';
import { GstAuditService } from './gst-audit.service';
import type { UpsertTaxConfigDto } from './dto/upsert-tax-config.dto';
import type { CreateEwayBillRecordDto } from './dto/create-eway-bill-record.dto';
import {
  SalesInvoice,
  SalesInvoiceDocument,
} from 'src/sales-dispatch/sales-invoice.schema';

@Injectable()
export class TaxComplianceService {
  constructor(
    private readonly taxConfigRepository: TaxConfigRepository,
    private readonly ewayBillRecordRepository: EwayBillRecordRepository,
    private readonly gstAuditService: GstAuditService,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
  ) {}

  async upsertTaxConfig(
    upsertTaxConfigDto: UpsertTaxConfigDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const sanitizedData = sanitizeObject(upsertTaxConfigDto) as UpsertTaxConfigDto;
    const existing = await this.taxConfigRepository.findByOrganizationId(orgId);
    if (!existing) {
      return this.taxConfigRepository.create({
        organizationId: new Types.ObjectId(orgId),
        defaultGstRate: sanitizedData.defaultGstRate,
        stateCode: sanitizedData.stateCode,
        gstEnabled: sanitizedData.gstEnabled,
      });
    }
    return this.taxConfigRepository.updateById(existing._id.toString(), {
      defaultGstRate: sanitizedData.defaultGstRate,
      stateCode: sanitizedData.stateCode,
      gstEnabled: sanitizedData.gstEnabled,
    });
  }

  async getTaxConfig(authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const config = await this.taxConfigRepository.findByOrganizationId(orgId);
    if (!config) {
      throw new NotFoundException('Tax config not found for organization');
    }
    return config;
  }

  async addEwayBillRecord(
    createEwayBillRecordDto: CreateEwayBillRecordDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const orgId = this.getOrgId(authenticatedUser);
    const sanitizedData = sanitizeObject(
      createEwayBillRecordDto,
    ) as CreateEwayBillRecordDto;
    const salesInvoiceId = validateObjectId(
      sanitizedData.salesInvoiceId,
      'Sales Invoice ID',
    );
    const salesInvoice = await this.salesInvoiceModel.findOne({
      _id: new Types.ObjectId(salesInvoiceId),
      organizationId: new Types.ObjectId(orgId),
    });
    if (!salesInvoice) {
      throw new NotFoundException('Sales invoice not found');
    }
    if (salesInvoice.status !== SalesInvoiceStatus.CONFIRMED) {
      throw new BadRequestException('E-Way Bill can be added only for confirmed invoice');
    }

    const existing = await this.ewayBillRecordRepository.findByOrgAndSalesInvoice(
      orgId,
      salesInvoiceId,
    );
    if (existing) {
      throw new BadRequestException('E-Way Bill record already exists');
    }

    const created = await this.ewayBillRecordRepository.create({
      organizationId: new Types.ObjectId(orgId),
      salesInvoiceId: new Types.ObjectId(salesInvoiceId),
      ewayBillNumber: sanitizedData.ewayBillNumber,
      ewayGeneratedDate: new Date(sanitizedData.ewayGeneratedDate),
      transportMode: sanitizedData.transportMode,
      vehicleNumber: sanitizedData.vehicleNumber,
      documentUrl: sanitizedData.documentUrl,
    });

    await this.salesInvoiceModel.findByIdAndUpdate(salesInvoiceId, {
      ewayBillNumber: sanitizedData.ewayBillNumber,
      ewayBillDocumentUrl: sanitizedData.documentUrl,
    });

    await this.gstAuditService.logEvent({
      organizationId: orgId,
      invoiceType: InvoiceType.SALES,
      invoiceId: salesInvoiceId,
      eventType: GstAuditEventType.EWAY_ADDED,
      metadata: {
        ewayBillNumber: sanitizedData.ewayBillNumber,
        transportMode: sanitizedData.transportMode,
      },
    });

    return created;
  }

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }
}
