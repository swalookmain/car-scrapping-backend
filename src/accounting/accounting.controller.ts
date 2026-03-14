import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { Roles } from 'src/common/decorators/roles.decorators';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enum/role.enum';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { LedgerEntryRepository } from './repositories/ledger-entry.repository';
import { PnlService, PnlSummary } from './services/pnl.service';
import { InvoicePaymentService } from './services/invoice-payment.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { PnlQueryDto } from './dto/pnl-query.dto';
import { CreateInvoicePaymentRecordDto } from './dto/create-invoice-payment-record.dto';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
@UseGuards(jwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly ledgerEntryRepository: LedgerEntryRepository,
    private readonly pnlService: PnlService,
    private readonly invoicePaymentService: InvoicePaymentService,
  ) {}

  @Get('chart-of-accounts')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get chart of accounts for the organization' })
  @ApiResponse({ status: 200, description: 'Chart of accounts' })
  getChartOfAccounts(@GetUser() user: AuthenticatedUser) {
    const orgId = user.orgId ?? '';
    if (!orgId) throw new BadRequestException('Organization not found');
    return this.chartOfAccountsService.getAccountsByOrganization(orgId);
  }

  @Get('ledger-entries')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List ledger entries with optional filters' })
  @ApiResponse({ status: 200, description: 'Ledger entries' })
  getLedgerEntries(
    @Query() query: LedgerQueryDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const orgId = user.orgId ?? '';
    if (!orgId) throw new BadRequestException('Organization not found');
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = ((query.page ?? 1) - 1) * limit;
    return this.ledgerEntryRepository.findByOrganization(orgId, {
      fromDate,
      toDate,
      accountId: query.accountId,
      referenceType: query.referenceType,
      limit,
      skip,
    });
  }

  @Get('pnl')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Basic P&L summary (income, expense, profit/loss)' })
  @ApiResponse({ status: 200, description: 'P&L summary' })
  getPnl(
    @Query() query: PnlQueryDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PnlSummary> {
    const orgId = user.orgId ?? '';
    if (!orgId) throw new BadRequestException('Organization not found');
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    return this.pnlService.getPnlSummary(orgId, fromDate, toDate);
  }

  @Post('invoice-payments')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  recordInvoicePayment(
    @Body() dto: CreateInvoicePaymentRecordDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.invoicePaymentService.recordPayment(dto, user);
  }

  @Get('invoice-payments')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get payment records for an invoice' })
  @ApiResponse({ status: 200, description: 'Payment records' })
  getInvoicePayments(
    @Query('invoiceType') invoiceType: string,
    @Query('invoiceId') invoiceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const orgId = user.orgId ?? '';
    if (!orgId) throw new BadRequestException('Organization not found');
    return this.invoicePaymentService.getPaymentsByInvoice(
      orgId,
      invoiceType,
      invoiceId,
    );
  }
}
