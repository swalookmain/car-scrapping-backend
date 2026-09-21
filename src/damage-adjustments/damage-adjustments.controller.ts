import {
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
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { DamageAdjustmentsService } from './damage-adjustments.service';
import { CreateDamageAdjustmentDto } from './dto/create-damage-adjustment.dto';
import { QueryDamageAdjustmentsDto } from './dto/query-damage-adjustments.dto';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';

@ApiTags('Damage Adjustments')
@ApiBearerAuth()
@Controller('damage-adjustments')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.INVENTORY.id)
export class DamageAdjustmentsController {
  constructor(
    private readonly damageAdjustmentsService: DamageAdjustmentsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create a damage adjustment for an inventory part' })
  @ApiResponse({
    status: 201,
    description: 'Damage adjustment created successfully',
  })
  create(
    @Body() createDto: CreateDamageAdjustmentDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.damageAdjustmentsService.create(createDto, authenticatedUser);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get damage adjustments with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Damage adjustments retrieved successfully',
  })
  findAll(
    @Query() query: QueryDamageAdjustmentsDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.damageAdjustmentsService.findAll(query, authenticatedUser);
  }
}

