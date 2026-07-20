import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateMaterialMasterDto } from './dto/create-material-master.dto';
import { MaterialMasterService } from './material-master.service';

@ApiTags('Material Master')
@ApiBearerAuth()
@Controller('material-master')
@UseGuards(jwtAuthGuard, RolesGuard)
export class MaterialMasterController {
  constructor(private readonly materialMasterService: MaterialMasterService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List system + org materials for FORM-3 / inventory' })
  list(@GetUser() user: AuthenticatedUser) {
    return this.materialMasterService.listForUser(user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Add org custom material (+ icon)' })
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateMaterialMasterDto,
  ) {
    return this.materialMasterService.createForOrg(user, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate org custom material' })
  deactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.materialMasterService.deactivateForOrg(user, id);
  }
}
