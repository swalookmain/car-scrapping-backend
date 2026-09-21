import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { InventoryAuditQueryDto } from './dto/inventory-audit-query.dto';
import { InventoryAuditService } from './inventory-audit.service';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';

@ApiTags('Inventory Audit')
@ApiBearerAuth()
@Controller('inventory-audit')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.INVENTORY.id)
export class InventoryAuditController {
  constructor(private readonly auditService: InventoryAuditService) {}

  @Get('preview')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'FORM-3 preview JSON for selected period' })
  preview(
    @GetUser() user: AuthenticatedUser,
    @Query() query: InventoryAuditQueryDto,
  ) {
    return this.auditService.preview(user, query);
  }

  @Get('pdf')
  @Roles(Role.ADMIN, Role.STAFF)
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download FORM-3 PDF (page1 filled, page2 blank)' })
  async pdf(
    @GetUser() user: AuthenticatedUser,
    @Query() query: InventoryAuditQueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.auditService.generatePdf(user, query);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="FORM-3-inventory-audit.pdf"',
    );
    res.send(pdf);
  }
}
