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
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

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
}
