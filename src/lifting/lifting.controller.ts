import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';
import { LiftingService } from './lifting.service';
import { QueryLiftingDto } from './dto/query-lifting.dto';

@ApiTags('Lifting')
@ApiBearerAuth()
@Controller('lifting')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.LIFTING.id)
export class LiftingController {
  constructor(private readonly liftingService: LiftingService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List lifting jobs by tab' })
  findAll(
    @Query() query: QueryLiftingDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.liftingService.findAll(query, authenticatedUser);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Lifting KPI counts for the current scope' })
  summary(
    @Query() query: QueryLiftingDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.liftingService.summary(query, authenticatedUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  findOne(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.liftingService.findOne(id, authenticatedUser);
  }
}
