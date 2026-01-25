import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateVechileInvoiceDto } from './dto/create-vechile-invoice.dto';
import { UpdateVechileInvoiceDto } from './dto/update-vechile-invoice.dto';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UploadPurchaseDocumentDto } from './dto/upload-purchase-document.dto';
import { QueryPurchaseDocumentDto } from './dto/query-purchase-document.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFiles, UseInterceptors } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
const uploadStorage = memoryStorage();

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
@UseGuards(jwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.createInvoice(createInvoiceDto, authenticatedUser);
  }

  @Post('vechile')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create a new vechile invoice' })
  @ApiResponse({
    status: 201,
    description: 'Vechile invoice created successfully',
  })
  createVechileInvoice(
    @Body() createVechileInvoiceDto: CreateVechileInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.createVechileInvoice(
      createVechileInvoiceDto,
      authenticatedUser,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get invoices with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  getInvoices(
    @Query() query: PaginationQueryDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.getInvoices(
      authenticatedUser,
      query.page,
      query.limit,
    );
  }

  @Get('vechile')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get vechile invoices with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vechile invoices retrieved successfully',
  })
  getVechileInvoices(
    @Query() query: PaginationQueryDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.getVechileInvoices(
      authenticatedUser,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  getInvoiceById(@Param('id') id: string) {
    return this.invoiceService.getInvoiceById(id);
  }

  @Get('vechile/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get vechile invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vechile invoice retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vechile invoice not found' })
  getVechileInvoiceById(@Param('id') id: string) {
    return this.invoiceService.getVechileInvoiceById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.updateInvoice(
      id,
      updateInvoiceDto,
      authenticatedUser,
    );
  }

  @Patch('vechile/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update vechile invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vechile invoice updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Vechile invoice not found' })
  updateVechileInvoice(
    @Param('id') id: string,
    @Body() updateVechileInvoiceDto: UpdateVechileInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.updateVechileInvoice(
      id,
      updateVechileInvoiceDto,
      authenticatedUser,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Delete invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  deleteInvoice(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.deleteInvoice(id, authenticatedUser);
  }

  @Delete('vechile/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Delete vechile invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vechile invoice deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Vechile invoice not found' })
  deleteVechileInvoice(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.deleteVechileInvoice(id, authenticatedUser);
  }

  @Post('purchase-documents')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Upload purchase documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
        vechileInvoiceId: { type: 'string' },
        rc: { type: 'string', format: 'binary' },
        ownerId: { type: 'string', format: 'binary' },
        otherDocument: { type: 'string', format: 'binary' },
      },
      required: ['invoiceId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase documents uploaded successfully',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'rc', maxCount: 1 },
        { name: 'ownerId', maxCount: 1 },
        { name: 'otherDocument', maxCount: 1 },
      ],
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        storage: uploadStorage as MulterOptions['storage'],
      },
    ),
  )
  uploadPurchaseDocuments(
    @Body() uploadDto: UploadPurchaseDocumentDto,
    @UploadedFiles()
    files: {
      rc?: Express.Multer.File[];
      ownerId?: Express.Multer.File[];
      otherDocument?: Express.Multer.File[];
    },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.uploadPurchaseDocuments(
      uploadDto,
      files,
      authenticatedUser,
    );
  }

  @Get('purchase-documents')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get purchase documents by invoice' })
  @ApiQuery({
    name: 'invoiceId',
    required: true,
    type: String,
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase documents retrieved successfully',
  })
  getPurchaseDocuments(
    @Query() query: QueryPurchaseDocumentDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.invoiceService.getPurchaseDocuments(
      query.invoiceId,
      authenticatedUser,
    );
  }
}
