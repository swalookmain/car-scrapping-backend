import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { YardService } from './yard.service';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { QueryYardVehicleDto } from './dto/query-yard-vehicle.dto';
import { UpdateYardVehicleStatusDto } from './dto/update-yard-vehicle-status.dto';
import { CreateYardZoneDto } from './dto/create-yard-zone.dto';
import { AddFromAuctionDto } from './dto/add-from-auction.dto';

@ApiTags('Yard')
@ApiBearerAuth()
@Controller('yard')
@UseGuards(jwtAuthGuard, RolesGuard)
export class YardController {
  constructor(private readonly yardService: YardService) {}

  @Get('eligible-auction-lots')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'List DEAL_DONE auction lots with vehicles for yard intake',
  })
  getEligibleAuctionLots(@GetUser() user: AuthenticatedUser) {
    return this.yardService.getEligibleAuctionLots(user);
  }

  @Post('from-auction')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'Park auction vehicles from a DEAL_DONE lot into the yard',
  })
  @ApiResponse({ status: 201, description: 'Vehicles parked in yard' })
  addFromAuction(
    @Body() dto: AddFromAuctionDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.addFromAuction(dto, user);
  }

  @Get('vehicles')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List yard vehicles' })
  findAll(
    @Query() query: QueryYardVehicleDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.findAll(query, user);
  }

  @Get('vehicles/by-vehicle-invoice/:vehicleInvoiceId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get yard record by purchase vehicle invoice id' })
  findByVehicleInvoice(
    @Param('vehicleInvoiceId') vehicleInvoiceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.findByVehicleInvoiceId(vehicleInvoiceId, user);
  }

  @Get('vehicles/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.yardService.findOne(id, user);
  }

  @Get('vehicles/:id/movements')
  @Roles(Role.ADMIN, Role.STAFF)
  getMovements(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.yardService.getMovements(id, user);
  }

  @Patch('vehicles/:id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateYardVehicleStatusDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.updateStatus(id, dto, user);
  }

  @Post('vehicles/:vehicleInvoiceId/start-dismantling')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Start dismantling for a parked yard vehicle' })
  startDismantling(
    @Param('vehicleInvoiceId') vehicleInvoiceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.startDismantling(vehicleInvoiceId, user);
  }

  @Post('backfill')
  @Roles(Role.ADMIN)
  @ApiQuery({ name: 'invoiceId', required: true })
  backfill(
    @Query('invoiceId') invoiceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.backfillForInvoice(invoiceId, user);
  }

  @Get('dashboard/summary')
  @Roles(Role.ADMIN, Role.STAFF)
  getDashboard(@GetUser() user: AuthenticatedUser) {
    return this.yardService.getDashboardSummary(user);
  }

  @Get('zones')
  @Roles(Role.ADMIN, Role.STAFF)
  getZones(@GetUser() user: AuthenticatedUser) {
    return this.yardService.getZones(user);
  }

  @Post('zones')
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 201, description: 'Zone created' })
  createZone(
    @Body() dto: CreateYardZoneDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.yardService.createZone(dto, user);
  }
}
