import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceRepository } from './invoice.repository';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import type { LoggerService } from '@nestjs/common';
import { sanitizeObject } from 'src/common/utils/security.util';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateVechileInvoiceDto } from './dto/create-vechile-invoice.dto';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { UpdateVechileInvoiceDto } from './dto/update-vechile-invoice.dto';
import { VechileInvoice } from './vechile-invoice.schema';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import { UploadPurchaseDocumentDto } from './dto/upload-purchase-document.dto';


@Injectable()
export class InvoiceService {
    constructor(
      private readonly invoiceRepository: InvoiceRepository,
      private readonly organizationsService: OrganizationsService,
      private readonly storageService: StorageService,
      @Inject(WINSTON_MODULE_NEST_PROVIDER)
      private readonly logger: LoggerService,
    ){}

    async createInvoice(createInvoiceDto: CreateInvoiceDto, authenticatedUser: AuthenticatedUser) {
      try {
        const sanitizedData = sanitizeObject(createInvoiceDto) as CreateInvoiceDto;
        const orgId = this.getOrgId(authenticatedUser);
        const organization = await this.organizationsService.getById(orgId);
        if(!organization) {
          throw new NotFoundException('Organization not found');
        }
        const { purchaseDate, ...restData } = sanitizedData;
        const invoicePayload = {
          ...restData,
          organizationId: new Types.ObjectId(orgId),
          createdBy: new Types.ObjectId(authenticatedUser.userId),
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
          ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {}),
        };
        const invoice = await this.invoiceRepository.createInvoice(invoicePayload);
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
        const invoice = await this.invoiceRepository.getInvoiceById(sanitizedData.invoiceId);
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }

        if(invoice.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('other vechile exist in this invoice');
        }

        const registerationNumberExist = await this.invoiceRepository.getVechileInvoiceByRegistrationNumber(sanitizedData.registrationNumber as string);
        if(registerationNumberExist) {
          throw new BadRequestException('Registration number already exists');
        }
        const vechileInvoice = await this.invoiceRepository.createVechileInvoice({
          ...sanitizedData,
          invoiceId: new Types.ObjectId(sanitizedData.invoiceId),
          organizationId: new Types.ObjectId(orgId),
        });
        // need to update status of invocie to confirmed
        await this.updateInvoice(invoice._id.toString(), { status: InvoiceStatus.CONFIRMED }, authenticatedUser);
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
        const invoice = await this.invoiceRepository.getInvoiceById(invoiceId);
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        if (invoice.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
      const { purchaseDate, ...restData } = sanitizedData;
        const updateData = {
          ...restData,
        organizationId: new Types.ObjectId(orgId),
          ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {}),
          updatedBy: new Types.ObjectId(authenticatedUser.userId),
        };
        const updatedInvoice = await this.invoiceRepository.updateInvoice(
          invoiceId,
          updateData,
        );
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
        const vechileInvoice = await this.invoiceRepository.getVechileInvoiceById(vechileInvoiceId);
        if(!vechileInvoice) {
          throw new NotFoundException('Vechile invoice not found');
        }
        const parentInvoice = await this.invoiceRepository.getInvoiceById(
          vechileInvoice.invoiceId.toString(),
        );
        if (parentInvoice?.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
        const { invoiceId, ...restData } = sanitizedData;
        const updateData: Partial<VechileInvoice> = {
          ...restData,
          organizationId: new Types.ObjectId(orgId),
          ...(invoiceId ? { invoiceId: new Types.ObjectId(invoiceId) } : {}),
        };
        const updatedVechileInvoice = await this.invoiceRepository.updateVechileInvoice(vechileInvoiceId, updateData);
        return updatedVechileInvoice;
      }
      catch (error) {
        if(error instanceof NotFoundException) {
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
        const invoice = await this.invoiceRepository.getInvoiceById(invoiceId);
        if(!invoice) {
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
        const vechileInvoice = await this.invoiceRepository.getVechileInvoiceById(vechileInvoiceId);
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
        const { page: safePage, limit: safeLimit } = getPagination(page, limit);
        const { data, total } = await this.invoiceRepository.findInvoices(
          { organizationId: orgId },
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
        throw new BadRequestException('Failed to get invoices');
      }
    }
    async getVechileInvoices(
      authenticatedUser: AuthenticatedUser,
      page = 1,
      limit = 10,
    ): Promise<PaginatedResponse<any>>
    {
      try {
        const orgId = this.getOrgId(authenticatedUser);
        const { page: safePage, limit: safeLimit } = getPagination(page, limit);
        const { data, total } = await this.invoiceRepository.findVechileInvoices(
            { organizationId: orgId },
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
        const invoice = await this.invoiceRepository.getInvoiceById(invoiceId);
        if(!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        if (invoice.status !== InvoiceStatus.CONFIRMED) {
          const deletedInvoice = await this.invoiceRepository.deleteInvoice(invoiceId);
          return {
            message: 'Invoice deleted successfully',
            invoice: deletedInvoice,
          };
        }
        const updatedInvoice = await this.invoiceRepository.updateInvoice(
          invoiceId,
          {
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
        const vechileInvoice = await this.invoiceRepository.getVechileInvoiceById(vechileInvoiceId);
        if(!vechileInvoice) {
          throw new NotFoundException('Vechile invoice not found');
        }
        const parentInvoice = await this.invoiceRepository.getInvoiceById(
          vechileInvoice.invoiceId.toString(),
        );
        if (parentInvoice?.status === InvoiceStatus.CONFIRMED) {
          throw new BadRequestException('Confirmed invoices cannot be updated');
        }
        await this.invoiceRepository.deleteVechileInvoice(vechileInvoiceId);
        // need to delete invoice related to this vechile invoice
        const updatedInvoice = await this.invoiceRepository.updateInvoice(
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
        rc?: UploadFile[];
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

        const invoice = await this.invoiceRepository.getInvoiceById(
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
            await this.invoiceRepository.getVechileInvoiceById(
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
          documentType: 'rc' | 'ownerId' | 'other';
        }> = [];
        const rcFile = resolveFile(files?.rc);
        if (rcFile) {
          fileEntries.push({ file: rcFile, documentType: 'rc' });
        }
        const ownerIdFile = resolveFile(files?.ownerId);
        if (ownerIdFile) {
          fileEntries.push({ file: ownerIdFile, documentType: 'ownerId' });
        }
        const otherFile = resolveFile(files?.otherDocument);
        if (otherFile) {
          fileEntries.push({ file: otherFile, documentType: 'other' });
        }

        if (fileEntries.length === 0) {
          return { message: 'No documents uploaded', documents: [] };
        }

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
          await this.invoiceRepository.createPurchaseDocuments(uploads);
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
      return this.invoiceRepository.findPurchaseDocumentsByInvoice(
        invoiceId,
        orgId,
      );
    }

    private getOrgId(authenticatedUser: AuthenticatedUser): string {
      if (!authenticatedUser.orgId) {
        throw new BadRequestException('Organization not found');
      }
      return authenticatedUser.orgId;
    }
}
