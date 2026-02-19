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
import { GetUser } from 'src/common/decorators/user.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { Role } from 'src/common/enum/role.enum';
import { CreateVehicleCodRecordDto } from './dto/create-vehicle-cod-record.dto';
import { UpdateVehicleCodTrackingDto } from './dto/update-vehicle-cod-tracking.dto';
import { VehicleComplianceService } from './vehicle-compliance.service';
import { QueryVehicleCodRecordDto } from './dto/query-vehicle-cod-record.dto';

@ApiTags('Vehicle Compliance')
@ApiBearerAuth()
@Controller('vehicle-compliance')
@UseGuards(jwtAuthGuard, RolesGuard)
export class VehicleComplianceController {
  constructor(
    private readonly vehicleComplianceService: VehicleComplianceService,
  ) {}

  @Post('vechile-cod')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create vehicle COD compliance record' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle COD compliance record created successfully',
  })
  createVehicleCodRecord(
    @Body() createVehicleCodRecordDto: CreateVehicleCodRecordDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.vehicleComplianceService.createVehicleCodRecord(
      createVehicleCodRecordDto,
      authenticatedUser,
    );
  }

  @Get('vechile-cod')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get vehicle COD compliance records with filters' })
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
    description: 'Vehicle COD compliance records retrieved successfully',
  })
  getVehicleCodRecords(
    @Query() query: QueryVehicleCodRecordDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.vehicleComplianceService.getVehicleCodRecords(
      query,
      authenticatedUser,
    );
  }

  @Patch('vechile-cod/:id/rto')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update vehicle COD RTO tracking and document details' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle COD tracking updated successfully',
  })
  updateVehicleCodTracking(
    @Param('id') id: string,
    @Body() updateVehicleCodTrackingDto: UpdateVehicleCodTrackingDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.vehicleComplianceService.updateVehicleCodTracking(
      id,
      updateVehicleCodTrackingDto,
      authenticatedUser,
    );
  }

  @Get('vechile-cod/vehicle/:vehicleId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get vehicle COD compliance record by vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle COD compliance record retrieved successfully',
  })
  getVehicleCodRecordByVehicleId(
    @Param('vehicleId') vehicleId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.vehicleComplianceService.getVehicleCodRecordByVehicleId(
      vehicleId,
      authenticatedUser,
    );
  }
}
