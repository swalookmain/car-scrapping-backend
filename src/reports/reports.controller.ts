import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { ReportsService, GstSummaryResponse } from './reports.service';
import { GstSummaryQueryDto } from './dto/gst-summary-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(jwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('gst-summary')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get GST summary for date range and optional invoice type' })
  @ApiResponse({ status: 200, description: 'GST summary' })
  getGstSummary(
    @Query() query: GstSummaryQueryDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ): Promise<GstSummaryResponse> {
    return this.reportsService.getGstSummary(query, authenticatedUser);
  }
}
