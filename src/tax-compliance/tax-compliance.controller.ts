import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorators';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enum/role.enum';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateEwayBillRecordDto } from './dto/create-eway-bill-record.dto';
import { QueryGstAuditLogDto } from './dto/query-gst-audit-log.dto';
import { UpsertTaxConfigDto } from './dto/upsert-tax-config.dto';
import { TaxComplianceService } from './tax-compliance.service';

@ApiTags('Tax Compliance')
@ApiBearerAuth()
@Controller('tax-compliance')
@UseGuards(jwtAuthGuard, RolesGuard)
export class TaxComplianceController {
  constructor(private readonly taxComplianceService: TaxComplianceService) {}

  @Post('config')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create or update tax configuration' })
  @ApiResponse({ status: 201, description: 'Tax config upserted successfully' })
  upsertTaxConfig(
    @Body() upsertTaxConfigDto: UpsertTaxConfigDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.taxComplianceService.upsertTaxConfig(
      upsertTaxConfigDto,
      authenticatedUser,
    );
  }

  @Get('config')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get organization tax configuration' })
  getTaxConfig(@GetUser() authenticatedUser: AuthenticatedUser) {
    return this.taxComplianceService.getTaxConfig(authenticatedUser);
  }

  @Post('eway-bills')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Add E-Way bill record for confirmed sales invoice' })
  addEwayBill(
    @Body() createEwayBillRecordDto: CreateEwayBillRecordDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.taxComplianceService.addEwayBillRecord(
      createEwayBillRecordDto,
      authenticatedUser,
    );
  }

  @Get('eway-bills')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get E-Way bill records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getEwayBills(
    @GetUser() authenticatedUser: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.taxComplianceService.getEwayBillRecords(
      authenticatedUser,
      page,
      limit,
    );
  }

  @Get('gst-audit-log')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get GST audit logs' })
  getGstAuditLogs(
    @Query() query: QueryGstAuditLogDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.taxComplianceService.getGstAuditLogs(query, authenticatedUser);
  }
}
