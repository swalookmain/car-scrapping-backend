import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceCounterRepository } from './invoice-counter.repository';
import { VehicleInvoiceRepository } from './vehicle-invoice.repository';
import { PurchaseDocumentRepository } from './purchase-document.repository';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import type { LoggerService } from '@nestjs/common';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateVechileInvoiceDto } from './dto/create-vechile-invoice.dto';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { UpdateVechileInvoiceDto } from './dto/update-vechile-invoice.dto';
import { VechileInvoice } from './vechile-invoice.schema';
import type { InvoiceDocument } from './invoice.schema';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import { UploadPurchaseDocumentDto } from './dto/upload-purchase-document.dto';
import { SellerType } from 'src/common/enum/sellerType.enum';
import { VehicleComplianceService } from 'src/vehicle-compliance/vehicle-compliance.service';
import { TaxEngineService } from 'src/tax-compliance/tax-engine.service';
import { TaxConfigRepository } from 'src/tax-compliance/tax-config.repository';
import { GstAuditService } from 'src/tax-compliance/gst-audit.service';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { GstAuditEventType } from 'src/common/enum/gstAuditEventType.enum';
import { LedgerService } from 'src/accounting/services/ledger.service';
import { LeadService } from 'src/lead/lead.service';
import { PurchaseDocumentType } from './purchase-document.schema';
import { LeadSource } from 'src/common/enum/leadSource.enum';
import type { LeadDocument } from 'src/lead/lead.schema';

@Injectable()
export class InvoiceService {
    constructor(
      private readonly invoiceRepository: InvoiceRepository,
      private readonly invoiceCounterRepository: InvoiceCounterRepository,
      private readonly vehicleInvoiceRepository: VehicleInvoiceRepository,
      private readonly purchaseDocumentRepository: PurchaseDocumentRepository,
      private readonly organizationsService: OrganizationsService,
      private readonly vehicleComplianceService: VehicleComplianceService,
      private readonly taxEngineService: TaxEngineService,
      private readonly taxConfigRepository: TaxConfigRepository,
      private readonly gstAuditService: GstAuditService,
      private readonly ledgerService: LedgerService,
      private readonly leadService: LeadService,
      private readonly storageService: StorageService,
      @Inject(WINSTON_MODULE_NEST_PROVIDER)
      private readonly logger: LoggerService,
    ){}

    async createInvoice(createInvoiceDto: CreateInvoiceDto, authenticatedUser: AuthenticatedUser) {
      try {
        let sanitizedData = sanitizeObject(createInvoiceDto) as CreateInvoiceDto;
        if (sanitizedData.leadId) {
          sanitizedData = await this.hydrateInvoiceFromLead(
            sanitizedData,
            authenticatedUser,
          );
        }
        this.assertSellerTypeFields(sanitizedData.sellerType, sanitizedData);
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const taxConfig = await this.taxConfigRepository.findByOrganizationId(orgId);
        if (!taxConfig) {
          throw new BadRequestException('Tax config not found for organization');
        }
        const gstApplicable = sanitizedData.gstApplicable ?? taxConfig.gstEnabled;
        const taxResult = this.taxEngineService.compute({
          taxableAmount: sanitizedData.purchaseAmount,
          gstApplicable,
          gstRate: sanitizedData.gstRate ?? taxConfig.defaultGstRate,
          reverseChargeApplicable: sanitizedData.reverseChargeApplicable,
          orgStateCode: taxConfig.stateCode,
          placeOfSupplyState: sanitizedData.placeOfSupplyState,
        });
        const { purchaseDate, auctionDate, leadId, ...restData } = sanitizedData;
        const purchaseDateValue =
          typeof purchaseDate === 'string' ? purchaseDate : undefined;
        const auctionDateValue =
          typeof auctionDate === 'string' ? auctionDate : undefined;
        const leadObjectId =
          typeof leadId === 'string' ? new Types.ObjectId(leadId) : undefined;
        const invoicePayload = {
          ...restData,
          invoiceNumber:
            (typeof sanitizedData.invoiceNumber === 'string' &&
              sanitizedData.invoiceNumber.trim()) ||
            (await this.generateInvoiceNumber(
              orgId,
              purchaseDateValue ? new Date(purchaseDateValue) : new Date(),
            )),
          organizationId: new Types.ObjectId(orgId),
          ...(leadObjectId
            ? { leadId: leadObjectId }
            : {}),
          createdBy: new Types.ObjectId(authenticatedUser.userId),
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
          __t: this.getDiscriminatorKeyValue(sanitizedData.sellerType),
          gstApplicable,
          gstRate: taxResult.gstRate,
          gstAmount: taxResult.totalTaxAmount,
          taxableAmount: taxResult.taxableAmount,
          cgstAmount: taxResult.cgstAmount,
          sgstAmount: taxResult.sgstAmount,
          igstAmount: taxResult.igstAmount,
          totalTaxAmount: taxResult.totalTaxAmount,
          isInterstate: taxResult.isInterstate,
          ...(purchaseDateValue
            ? { purchaseDate: new Date(purchaseDateValue) }
            : {}),
          ...(auctionDateValue ? { auctionDate: new Date(auctionDateValue) } : {}),
        };
        const invoice = await this.invoiceRepository.create(invoicePayload);
        const linkedLeadId = typeof leadId === 'string' ? leadId : undefined;
        if (linkedLeadId) {
          await this.leadService.linkInvoiceToLead(
            linkedLeadId,
            invoice._id.toString(),
            authenticatedUser,
          );
        }
        await this.gstAuditService.logEvent({
          organizationId: orgId,
          invoiceType: InvoiceType.PURCHASE,
          invoiceId: invoice._id.toString(),
          eventType: GstAuditEventType.GST_CALCULATED,
          metadata: {
            taxableAmount: taxResult.taxableAmount,
            cgstAmount: taxResult.cgstAmount,
            sgstAmount: taxResult.sgstAmount,
            igstAmount: taxResult.igstAmount,
            totalTaxAmount: taxResult.totalTaxAmount,
            reverseChargeApplicable: sanitizedData.reverseChargeApplicable,
          },
        });
        if (sanitizedData.reverseChargeApplicable) {
          await this.gstAuditService.logEvent({
            organizationId: orgId,
            invoiceType: InvoiceType.PURCHASE,
            invoiceId: invoice._id.toString(),
            eventType: GstAuditEventType.RCM_APPLIED,
            metadata: {
              payableAmount: taxResult.totalAmount,
              totalTaxAmount: taxResult.totalTaxAmount,
            },
          });
        }
        return invoice;
      } catch (error) {
        if(error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to create invoice');
      }
    }

    async createVechileInvoice(createVechileInvoiceDto: CreateVechileInvoiceDto, authenticatedUser: AuthenticatedUser) {
      try {
        const sanitizedData = sanitizeObject(createVechileInvoiceDto);
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        if(!sanitizedData.invoiceId) {
          throw new BadRequestException('Invoice ID is required');
        }
        const invoice = (await this.invoiceRepository.findById(
          sanitizedData.invoiceId,
        )) as InvoiceDocument | null;
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }

        if(invoice.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('other vechile exist in this invoice');
        }

        await this.assertInvoiceDocumentsReadyForConfirmation(
          invoice._id.toString(),
          orgId,
        );

        const registerationNumberExist =
          await this.vehicleInvoiceRepository.findOneByRegistrationNumber(
            sanitizedData.registration_number as string,
          );
        if(registerationNumberExist) {
          throw new BadRequestException('Registration number already exists');
        }
        const { model, ...restData } = sanitizedData as Record<string, unknown>;
        const normalizedData = {
          ...restData,
          ...(typeof model === 'string' ? { model_name: model } : {}),
        } as Record<string, unknown>;
        const vehiclePurchaseDateValue =
          typeof normalizedData.vehicle_purchase_date === 'string'
            ? normalizedData.vehicle_purchase_date
            : undefined;
        const vechileInvoice = await this.vehicleInvoiceRepository.create(
          {
            ...normalizedData,
            invoiceId: new Types.ObjectId(sanitizedData.invoiceId),
            organizationId: new Types.ObjectId(orgId),
            ...(vehiclePurchaseDateValue
              ? {
                  vehicle_purchase_date: new Date(vehiclePurchaseDateValue),
                }
              : {}),
          },
        );
        // need to update status of invocie to confirmed
        await this.updateInvoice(invoice._id.toString(), { status: InvoiceStatus.CONFIRMED }, authenticatedUser);
        const rawInvoiceLeadId: unknown = invoice.leadId;
        const invoiceLeadId =
          rawInvoiceLeadId instanceof Types.ObjectId
            ? rawInvoiceLeadId.toString()
            : typeof rawInvoiceLeadId === 'string'
              ? rawInvoiceLeadId
              : undefined;
        if (invoiceLeadId) {
          await this.leadService.closeLeadForInvoice(
            invoiceLeadId,
            invoice._id.toString(),
            authenticatedUser,
          );
        }
        return vechileInvoice;
      } catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException('Failed to create vechile invoice');
      }
    }


    async updateInvoice(invoiceId: string, invoiceDto: UpdateInvoiceDto, authenticatedUser: AuthenticatedUser)
    {
      try {
        const sanitizedData = sanitizeObject(invoiceDto) as UpdateInvoiceDto;
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        if (invoice.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
        if (sanitizedData.sellerType) {
          this.assertSellerTypeFields(sanitizedData.sellerType, sanitizedData);
        }
        const taxConfig = await this.taxConfigRepository.findByOrganizationId(orgId);
        if (!taxConfig) {
          throw new BadRequestException('Tax config not found for organization');
        }
        const taxableAmount =
          sanitizedData.purchaseAmount ?? invoice.purchaseAmount;
        const gstApplicable =
          sanitizedData.gstApplicable ?? invoice.gstApplicable ?? taxConfig.gstEnabled;
        const reverseChargeApplicable =
          sanitizedData.reverseChargeApplicable ?? invoice.reverseChargeApplicable;
        const placeOfSupplyState =
          sanitizedData.placeOfSupplyState ?? invoice.placeOfSupplyState;
        const taxResult = this.taxEngineService.compute({
          taxableAmount,
          gstApplicable,
          gstRate:
            sanitizedData.gstRate ?? invoice.gstRate ?? taxConfig.defaultGstRate,
          reverseChargeApplicable,
          orgStateCode: taxConfig.stateCode,
          placeOfSupplyState,
        });
        const { purchaseDate, auctionDate, ...restData } = sanitizedData;
        const purchaseDateValue =
          typeof purchaseDate === 'string' ? purchaseDate : undefined;
        const auctionDateValue =
          typeof auctionDate === 'string' ? auctionDate : undefined;
        const updateFields = {
          ...restData,
          organizationId: new Types.ObjectId(orgId),
          ...(purchaseDateValue
            ? { purchaseDate: new Date(purchaseDateValue) }
            : {}),
          ...(auctionDateValue ? { auctionDate: new Date(auctionDateValue) } : {}),
          gstApplicable,
          gstRate: taxResult.gstRate,
          gstAmount: taxResult.totalTaxAmount,
          taxableAmount: taxResult.taxableAmount,
          cgstAmount: taxResult.cgstAmount,
          sgstAmount: taxResult.sgstAmount,
          igstAmount: taxResult.igstAmount,
          totalTaxAmount: taxResult.totalTaxAmount,
          isInterstate: taxResult.isInterstate,
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
        };
        const updateData: Record<string, unknown> = {
          $set: updateFields,
        };

        if (
          sanitizedData.sellerType &&
          sanitizedData.sellerType !== invoice.sellerType
        ) {
          updateData.$unset = this.getSellerTypeUnsetFields(
            sanitizedData.sellerType,
          );
          updateData.$set = {
            ...(updateData.$set as Record<string, unknown>),
            __t: this.getDiscriminatorKeyValue(sanitizedData.sellerType),
          };
        }

        const updatedInvoice = await this.invoiceRepository.updateById(
          invoiceId,
          updateData,
        );
        if (
          sanitizedData.status === InvoiceStatus.CONFIRMED &&
          updatedInvoice
        ) {
          await this.ledgerService.postPurchaseInvoice(orgId, {
            _id: updatedInvoice._id,
            organizationId: updatedInvoice.organizationId,
            taxableAmount: updatedInvoice.taxableAmount,
            totalTaxAmount: updatedInvoice.totalTaxAmount,
            reverseChargeApplicable: updatedInvoice.reverseChargeApplicable,
          });
        }
        await this.gstAuditService.logEvent({
          organizationId: orgId,
          invoiceType: InvoiceType.PURCHASE,
          invoiceId,
          eventType: GstAuditEventType.GST_CALCULATED,
          metadata: {
            taxableAmount: taxResult.taxableAmount,
            cgstAmount: taxResult.cgstAmount,
            sgstAmount: taxResult.sgstAmount,
            igstAmount: taxResult.igstAmount,
            totalTaxAmount: taxResult.totalTaxAmount,
            reverseChargeApplicable,
          },
        });
        if (reverseChargeApplicable) {
          await this.gstAuditService.logEvent({
            organizationId: orgId,
            invoiceType: InvoiceType.PURCHASE,
            invoiceId,
            eventType: GstAuditEventType.RCM_APPLIED,
            metadata: {
              payableAmount: taxResult.totalAmount,
              totalTaxAmount: taxResult.totalTaxAmount,
            },
          });
        }
        return updatedInvoice;
      } catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to update invoice status');
      }
    }

    async updateVechileInvoice(vechileInvoiceId: string, vechileInvoiceDto: UpdateVechileInvoiceDto, authenticatedUser: AuthenticatedUser)
    {
      try {
        const sanitizedData = sanitizeObject(vechileInvoiceDto);
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const vechileInvoice = await this.vehicleInvoiceRepository.findById(vechileInvoiceId);
        if(!vechileInvoice) {
          throw new NotFoundException('Vechile invoice not found');
        }
        const parentInvoice = await this.invoiceRepository.findById(
          vechileInvoice.invoiceId.toString(),
        );
        if (parentInvoice?.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
        const { invoiceId, vehicle_purchase_date, model, ...restData } =
          sanitizedData as Record<string, unknown>;
        const normalizedData = {
          ...restData,
          ...(typeof model === 'string' ? { model_name: model } : {}),
        } as Record<string, unknown>;
        const vehiclePurchaseDateValue =
          typeof vehicle_purchase_date === 'string'
            ? vehicle_purchase_date
            : undefined;
        const updateData: Partial<VechileInvoice> = {
          ...normalizedData,
          organizationId: new Types.ObjectId(orgId),
          ...(typeof invoiceId === 'string'
            ? { invoiceId: new Types.ObjectId(invoiceId) }
            : {}),
          ...(vehiclePurchaseDateValue
            ? { vehicle_purchase_date: new Date(vehiclePurchaseDateValue) }
            : {}),
        };
        const updatedVechileInvoice = await this.vehicleInvoiceRepository.updateById(vechileInvoiceId, updateData);
        return updatedVechileInvoice;
      }
      catch (error) {
        if(error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to update vechile invoice');
      }
    }

    async getInvoiceById(invoiceId: string)
    {
      try {
        const invoice = await this.invoiceRepository.findByIdWithUserNames(invoiceId);
        if(!invoice || invoice.isDeleted) {
          throw new NotFoundException('Invoice not found');
        }
        return invoice;
      } catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to get invoice');
      }
    }
    async getVechileInvoiceById(vechileInvoiceId: string)
    {
      try {
        const vechileInvoice = await this.vehicleInvoiceRepository.findById(vechileInvoiceId);
        if(!vechileInvoice) {
          throw new NotFoundException('Vechile invoice not found');
        }
        return vechileInvoice;
      } catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to get vechile invoice');
      }
    }

    async getInvoices(
      authenticatedUser: AuthenticatedUser,
      page = 1,
      limit = 10,
    ): Promise<PaginatedResponse<any>>
    {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        console.log('orgId', orgId);
        const { page: safePage, limit: safeLimit } = getPagination(page, limit);
        const { data, total } = await this.invoiceRepository.findPaginatedWithUserNames(
          {
            organizationId: new Types.ObjectId(orgId),
            isDeleted: { $ne: true },
          },
          safePage,
          safeLimit,
        );
        console.log('data', data);
        console.log('total', total);
        const totalPages = Math.ceil(total / safeLimit);
        console.log('totalPages', totalPages);

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
      catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to get invoices');
      }
    }
    async getVechileInvoices(
      authenticatedUser: AuthenticatedUser,
      invoiceId?: string,
      page = 1,
      limit = 10,
    ): Promise<PaginatedResponse<any>>
    {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        const filter: Record<string, unknown> = {
          organizationId: new Types.ObjectId(orgId),
        };
        if (invoiceId) {
          filter.invoiceId = new Types.ObjectId(
            validateObjectId(invoiceId, 'Invoice ID'),
          );
        }
        const { page: safePage, limit: safeLimit } = getPagination(page, limit);
        const { data, total } = await this.vehicleInvoiceRepository.findPaginated(
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
      catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to get vechile invoices');
      }
    }

    async deleteInvoice(invoiceId: string, authenticatedUser: AuthenticatedUser)
    {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        if (invoice.status !== InvoiceStatus.CONFIRMED) {
          const deletedInvoice = await this.invoiceRepository.deleteById(invoiceId);
          return {
            message: 'Invoice deleted successfully',
            invoice: deletedInvoice,
          };
        }
        const updatedInvoice = await this.invoiceRepository.updateById(
          invoiceId,
          {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: new Types.ObjectId(authenticatedUser.userId),
          },
        );
        return {
          message: 'Invoice deleted successfully',
          invoice: updatedInvoice,
        };
      }
      catch (error) {
        if(error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to delete invoice');
      }
    }

    async deleteVechileInvoice(vechileInvoiceId: string, authenticatedUser: AuthenticatedUser)
    {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const vechileInvoice = await this.vehicleInvoiceRepository.findById(vechileInvoiceId);
        if(!vechileInvoice) {
          throw new NotFoundException('Vechile invoice not found');
        }
        const parentInvoice = await this.invoiceRepository.findById(
          vechileInvoice.invoiceId.toString(),
        );
        if (parentInvoice?.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
        await this.vehicleInvoiceRepository.deleteById(vechileInvoiceId);
        // need to delete invoice related to this vechile invoice
        const updatedInvoice = await this.invoiceRepository.updateById(
          vechileInvoice.invoiceId.toString(),
          {
            deletedAt: new Date(),
            deletedBy: new Types.ObjectId(authenticatedUser.userId),
          },
        );
        return {
          message: 'Vechile invoice deleted successfully',
          invoice: updatedInvoice,
        };
      }
      catch (error) {
        if(error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to delete vechile invoice');
      }
    }

    async uploadPurchaseDocuments(
      uploadDto: UploadPurchaseDocumentDto,
      files: {
        rcFront?: UploadFile[];
        rcBack?: UploadFile[];
        aadhaarFront?: UploadFile[];
        aadhaarBack?: UploadFile[];
        pan?: UploadFile[];
        bankDetail?: UploadFile[];
        ownerId?: UploadFile[];
        otherDocument?: UploadFile[];
      },
      authenticatedUser: AuthenticatedUser,
    ) {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if (!organization) {
          throw new NotFoundException('Organization not found');
        }

        const invoice = await this.invoiceRepository.findById(
          uploadDto.invoiceId,
        );
        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        if (invoice.organizationId?.toString() !== orgId) {
          throw new BadRequestException('Invoice does not belong to organization');
        }

        if (uploadDto.vechileInvoiceId) {
          const vechileInvoice =
            await this.vehicleInvoiceRepository.findById(
              uploadDto.vechileInvoiceId,
            );
          if (!vechileInvoice) {
            throw new NotFoundException('Vechile invoice not found');
          }
          if (vechileInvoice.organizationId?.toString() !== orgId) {
            throw new BadRequestException(
              'Vechile invoice does not belong to organization',
            );
          }
        }

        const resolveFile = (value?: UploadFile[]): UploadFile | undefined => {
          if (!value || !Array.isArray(value)) {
            return undefined;
          }
          return value[0];
        };

        const fileEntries: Array<{
          file: UploadFile;
          documentType: PurchaseDocumentType;
        }> = [];
        this.pushPurchaseDocument(fileEntries, resolveFile(files?.rcFront), 'rcFront');
        this.pushPurchaseDocument(fileEntries, resolveFile(files?.rcBack), 'rcBack');
        this.pushPurchaseDocument(
          fileEntries,
          resolveFile(files?.aadhaarFront),
          'aadhaarFront',
        );
        this.pushPurchaseDocument(
          fileEntries,
          resolveFile(files?.aadhaarBack),
          'aadhaarBack',
        );
        this.pushPurchaseDocument(fileEntries, resolveFile(files?.pan), 'pan');
        this.pushPurchaseDocument(
          fileEntries,
          resolveFile(files?.bankDetail),
          'bankDetail',
        );
        const ownerIdFile = resolveFile(files?.ownerId);
        if (ownerIdFile) {
          fileEntries.push({ file: ownerIdFile, documentType: 'ownerId' });
          fileEntries.push({ file: ownerIdFile, documentType: 'aadhaarFront' });
        }
        this.pushPurchaseDocument(
          fileEntries,
          resolveFile(files?.otherDocument),
          'other',
        );

        if (fileEntries.length === 0) {
          return { message: 'No documents uploaded', documents: [] };
        }

        fileEntries.forEach(({ file }) => assertSupportedDocumentFile(file));

        const prefix = `purchase-documents/${orgId}/${uploadDto.invoiceId}`;
        const uploads = await Promise.all(
          fileEntries.map(async ({ file, documentType }) => {
            const upload = await this.storageService.uploadFile(file, prefix);
            return {
              invoiceId: new Types.ObjectId(uploadDto.invoiceId),
              vechileInvoiceId: uploadDto.vechileInvoiceId
                ? new Types.ObjectId(uploadDto.vechileInvoiceId)
                : undefined,
              organizationId: new Types.ObjectId(orgId),
              uploadedBy: new Types.ObjectId(authenticatedUser.userId),
              fileName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: upload.url,
              storageKey: upload.storageKey,
              provider: upload.provider,
              documentType,
            };
          }),
        );

        const saved =
          await this.purchaseDocumentRepository.createMany(uploads);
        return { message: 'Documents uploaded', documents: saved };
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to upload purchase documents');
      }
    }

    async getPurchaseDocuments(
      invoiceId: string,
      authenticatedUser: AuthenticatedUser,
    ) {
      const orgId = this.getOrgId(authenticatedUser);
      return this.purchaseDocumentRepository.findByInvoiceAndOrg(
        invoiceId,
        orgId,
      );
    }

    private async hydrateInvoiceFromLead(
      data: CreateInvoiceDto,
      authenticatedUser: AuthenticatedUser,
    ): Promise<CreateInvoiceDto> {
      if (data.sellerType && data.sellerType !== SellerType.DIRECT) {
        throw new BadRequestException(
          'Lead linkage is only supported for direct seller invoices',
        );
      }

      const lead = (await this.leadService.validateLeadForInvoiceLink(
        data.leadId as string,
        authenticatedUser,
      )) as LeadDocument;
      const leadPlaceOfSupplyState =
        typeof lead.placeOfSupplyState === 'string'
          ? lead.placeOfSupplyState
          : '';
      const leadPurchaseDate =
        lead.purchaseDate instanceof Date
          ? lead.purchaseDate.toISOString()
          : '';
      const leadPurchaseAmount =
        typeof lead.purchaseAmount === 'number' ? lead.purchaseAmount : undefined;
      const leadReverseChargeApplicable =
        typeof lead.reverseChargeApplicable === 'boolean'
          ? lead.reverseChargeApplicable
          : false;
      const leadSourceValue: unknown = lead.leadSource;
      const resolvedLeadSource =
        Object.values(LeadSource).includes(leadSourceValue as LeadSource)
          ? (leadSourceValue as LeadSource)
          : undefined;

      return {
        ...data,
        sellerType: SellerType.DIRECT,
        sellerName: data.sellerName || lead.name,
        mobile: data.mobile || lead.mobileNumber,
        email: data.email || lead.email,
        aadhaarNumber: data.aadhaarNumber || lead.aadhaarNumber,
        panNumber: data.panNumber || lead.panNumber,
        placeOfSupplyState:
          data.placeOfSupplyState || leadPlaceOfSupplyState,
        purchaseAmount:
          data.purchaseAmount ?? leadPurchaseAmount ?? data.purchaseAmount,
        purchaseDate: data.purchaseDate || leadPurchaseDate,
        reverseChargeApplicable:
          data.reverseChargeApplicable ?? leadReverseChargeApplicable,
        leadSource: data.leadSource ?? resolvedLeadSource ?? LeadSource.WEBSITE,
      };
    }

    private async generateInvoiceNumber(orgId: string, purchaseDate: Date) {
      const financialYear = this.getFinancialYear(purchaseDate);
      const sequence = await this.invoiceCounterRepository.getNextSequence(
        orgId,
        financialYear,
      );
      const paddedSequence = String(sequence).padStart(6, '0');
      return `INV/${financialYear}/${paddedSequence}`;
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

    private pushPurchaseDocument(
      fileEntries: Array<{
        file: UploadFile;
        documentType: PurchaseDocumentType;
      }>,
      file: UploadFile | undefined,
      documentType: PurchaseDocumentType,
    ) {
      if (file) {
        fileEntries.push({ file, documentType });
      }
    }

    private async assertInvoiceDocumentsReadyForConfirmation(
      invoiceId: string,
      orgId: string,
    ) {
      const documents = await this.purchaseDocumentRepository.findByInvoiceAndOrg(
        invoiceId,
        orgId,
      );
      const documentTypes = new Set(
        documents.map((document) => document.documentType),
      );

      const requiredDocs: PurchaseDocumentType[] = [
        'rcFront',
        'aadhaarFront',
      ];
      const missingDocs = requiredDocs.filter((documentType) => {
        if (documentType === 'aadhaarFront') {
          return !(
            documentTypes.has('aadhaarFront') || documentTypes.has('ownerId')
          );
        }
        return !documentTypes.has(documentType);
      });

      if (missingDocs.length > 0) {
        throw new BadRequestException(
          `Required purchase documents are missing: ${missingDocs.join(', ')}`,
        );
      }
    }

    private assertSellerTypeFields(
      sellerType: SellerType,
      data: Partial<CreateInvoiceDto>,
    ): void {
      const requiredFields: Record<SellerType, Array<keyof CreateInvoiceDto>> = {
        [SellerType.DIRECT]: [
          'mobile',
          'email',
          'aadhaarNumber',
          'panNumber',
          'leadSource',
        ],
        [SellerType.MSTC]: [
          'auctionNumber',
          'auctionDate',
          'source',
          'lotNumber',
        ],
        [SellerType.GEM]: [],
      };

      const missing = (requiredFields[sellerType] || []).filter((field) => {
        const value = data[field];
        return value === undefined || value === null || value === '';
      });

      if (missing.length > 0) {
        throw new BadRequestException(
          `Missing required fields for ${sellerType}: ${missing.join(', ')}`,
        );
      }
    }

    private getSellerTypeUnsetFields(
      sellerType: SellerType,
    ): Record<string, ''> {
      const directFields = [
        'mobile',
        'email',
        'aadhaarNumber',
        'panNumber',
        'leadSource',
      ];
      const mstcFields = ['auctionNumber', 'auctionDate', 'source', 'lotNumber'];

      if (sellerType === SellerType.DIRECT) {
        return mstcFields.reduce<Record<string, ''>>((acc, field) => {
          acc[field] = '';
          return acc;
        }, {});
      }

      if (sellerType === SellerType.MSTC) {
        return directFields.reduce<Record<string, ''>>((acc, field) => {
          acc[field] = '';
          return acc;
        }, {});
      }

      return [...directFields, ...mstcFields].reduce<Record<string, ''>>(
        (acc, field) => {
          acc[field] = '';
          return acc;
        },
        {},
      );
    }

    private getDiscriminatorKeyValue(sellerType: SellerType): SellerType {
      return sellerType;
    }

    private getOrgId(authenticatedUser: AuthenticatedUser): string {
      if (!authenticatedUser.orgId) {
        throw new BadRequestException('Organization not found');
      }
      return authenticatedUser.orgId;
    }
}
