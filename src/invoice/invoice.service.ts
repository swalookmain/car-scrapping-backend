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


@Injectable()
export class InvoiceService {
    constructor(
      private readonly invoiceRepository: InvoiceRepository,
      private readonly organizationsService: OrganizationsService,
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
        if(error instanceof NotFoundException) {
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
        const { data, total } =
          await this.invoiceRepository.findVechileInvoices(
            { organizationId: orgId },
            safePage,
            safeLimit,
          );
          console.log('vechileInvoice',data);

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
        await this.invoiceRepository.deleteInvoice(invoiceId);
        // need to delete all vechile invoices related to this invoice
        await this.invoiceRepository.deleteVechileInvoices(invoiceId);
        return { message: 'Invoice deleted successfully' };
      }
      catch (error) {
        if(error instanceof NotFoundException) {
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
        await this.invoiceRepository.deleteVechileInvoice(vechileInvoiceId);
        // need to delete invoice related to this vechile invoice
        await this.invoiceRepository.deleteInvoice(vechileInvoice.invoiceId.toString());
        return { message: 'Vechile invoice deleted successfully' };
      }
      catch (error) {
        if(error instanceof NotFoundException) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(errorMessage, errorStack, 'InvoiceService');
        throw new BadRequestException('Failed to delete vechile invoice');
      }
    }

    private getOrgId(authenticatedUser: AuthenticatedUser): string {
      if (!authenticatedUser.orgId) {
        throw new BadRequestException('Organization not found');
      }
      return authenticatedUser.orgId;
    }
}
