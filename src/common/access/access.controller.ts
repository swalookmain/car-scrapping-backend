import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorators';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SkipModuleCheck } from 'src/common/decorators/skip-module-check.decorator';
import { permissionCatalog } from './app-modules';

@ApiTags('Access')
@ApiBearerAuth()
@Controller('access')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SkipModuleCheck()
export class AccessController {
  @Get('modules')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Permission catalog from APP_MODULES (staff assignment UI)',
  })
  listModules() {
    return permissionCatalog();
  }
}
