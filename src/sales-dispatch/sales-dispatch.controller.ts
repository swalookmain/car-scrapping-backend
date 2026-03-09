import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { SalesDispatchService } from './sales-dispatch.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { QueryBuyersDto } from './dto/query-buyers.dto';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { QuerySalesInvoiceDto } from './dto/query-sales-invoice.dto';

@ApiTags('Sales Dispatch')
@ApiBearerAuth()
@Controller('sales-dispatch')
@UseGuards(jwtAuthGuard, RolesGuard)
export class SalesDispatchController {
  constructor(private readonly salesDispatchService: SalesDispatchService) {}

  @Post('buyers')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create buyer master' })
  @ApiResponse({ status: 201, description: 'Buyer created successfully' })
  createBuyer(
    @Body() createBuyerDto: CreateBuyerDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.createBuyer(createBuyerDto, authenticatedUser);
  }

  @Get('buyers')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get buyers with filters' })
  getBuyers(
    @Query() query: QueryBuyersDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.getBuyers(query, authenticatedUser);
  }

  @Get('buyers/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get buyer by ID' })
  getBuyerById(
    @Param('id') buyerId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.getBuyerById(buyerId, authenticatedUser);
  }

  @Patch('buyers/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update buyer by ID' })
  updateBuyer(
    @Param('id') buyerId: string,
    @Body() updateBuyerDto: UpdateBuyerDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.updateBuyer(
      buyerId,
      updateBuyerDto,
      authenticatedUser,
    );
  }

  @Delete('buyers/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete buyer by ID' })
  deleteBuyer(
    @Param('id') buyerId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.deleteBuyer(buyerId, authenticatedUser);
  }

  @Post('invoices')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create draft sales invoice' })
  createDraftInvoice(
    @Body() createSalesInvoiceDto: CreateSalesInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.createDraftInvoice(
      createSalesInvoiceDto,
      authenticatedUser,
    );
  }

  @Get('invoices')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get sales invoices with filters' })
  getSalesInvoices(
    @Query() query: QuerySalesInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.getSalesInvoices(query, authenticatedUser);
  }

  @Get('invoices/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get sales invoice by ID' })
  getSalesInvoiceById(
    @Param('id') salesInvoiceId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.getSalesInvoiceById(
      salesInvoiceId,
      authenticatedUser,
    );
  }

  @Patch('invoices/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update draft sales invoice' })
  updateDraftInvoice(
    @Param('id') salesInvoiceId: string,
    @Body() updateSalesInvoiceDto: UpdateSalesInvoiceDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.updateDraftInvoice(
      salesInvoiceId,
      updateSalesInvoiceDto,
      authenticatedUser,
    );
  }

  @Patch('invoices/:id/confirm')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Confirm sales invoice and deduct inventory' })
  confirmSalesInvoice(
    @Param('id') salesInvoiceId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.confirmSalesInvoice(
      salesInvoiceId,
      authenticatedUser,
    );
  }

  @Patch('invoices/:id/cancel')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Cancel sales invoice and reverse inventory' })
  cancelSalesInvoice(
    @Param('id') salesInvoiceId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.salesDispatchService.cancelSalesInvoice(
      salesInvoiceId,
      authenticatedUser,
    );
  }
}
