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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryBatchDto,
} from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Condition } from 'src/common/enum/condition.enum';
import { Status } from 'src/common/enum/status.enum';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.INVENTORY.id)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create parts inventory in batch' })
  @ApiResponse({ status: 201, description: 'Inventory created successfully' })
  create(
    @Body() createInventoryDto: CreateInventoryBatchDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.createBatch(
      createInventoryDto,
      authenticatedUser,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get inventory with optional filters' })
  @ApiQuery({ name: 'invoiceId', required: false, type: String })
  @ApiQuery({ name: 'vechileId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: Status })
  @ApiQuery({ name: 'condition', required: false, enum: Condition })
  @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
  findAll(
    @Query() query: PaginationQueryDto & {
      invoiceId?: string;
      vechileId?: string;
      status?: Status;
      condition?: Condition;
    },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.findAll(
      {
        invoiceId: query.invoiceId,
        vechileId: query.vechileId,
        status: query.status,
        condition: query.condition,
        page: query.page,
        limit: query.limit,
      },
      authenticatedUser,
    );
  }

  @Get('vehicles')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List inventory grouped by vehicle' })
  @ApiQuery({ name: 'search', required: false, type: String })
  findVehicles(
    @Query() query: PaginationQueryDto & { search?: string },
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.findVehicles({
      page: query.page,
      limit: query.limit,
      search: query.search,
      organizationId: user.orgId || undefined,
    }, user);
  }

  @Get('by-vehicle/:vechileId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get all parts for a vehicle' })
  findByVehicle(
    @Param('vechileId') vechileId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.findByVehicle(vechileId, authenticatedUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  findOne(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.findOne(id, authenticatedUser);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update inventory by ID' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.update(id, updateInventoryDto, authenticatedUser);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.inventoryService.remove(id, authenticatedUser);
  }
}
