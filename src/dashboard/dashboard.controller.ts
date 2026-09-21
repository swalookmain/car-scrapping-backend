import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.DASHBOARD.id)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Organization operations dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview payload' })
  getOverview(@GetUser() user: AuthenticatedUser) {
    return this.dashboardService.getOverview(user);
  }
}
