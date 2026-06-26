import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { PartCatalogService } from './part-catalog.service';
import { AddVariantPartDto } from './dto/add-variant-part.dto';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { VehicleType } from 'src/common/enum/vehicleType.enum';

@ApiTags('Part Catalog')
@ApiBearerAuth()
@Controller('part-catalog')
@UseGuards(jwtAuthGuard, RolesGuard)
export class PartCatalogController {
  constructor(private readonly partCatalogService: PartCatalogService) {}

  @Get('categories')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List all part categories' })
  getCategories() {
    return this.partCatalogService.getPartCategories();
  }

  @Post('categories')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create a new part category (duplicate check on slug)' })
  createCategory(@Body() dto: CreatePartCategoryDto) {
    return this.partCatalogService.createPartCategory(dto);
  }

  @Get('makes')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List all vehicle makes' })
  getMakes() {
    return this.partCatalogService.getMakes();
  }

  @Get('makes/:makeId/models')
  @Roles(Role.ADMIN, Role.STAFF)
  getModels(@Param('makeId') makeId: string) {
    return this.partCatalogService.getModels(makeId);
  }

  @Get('models/:modelId/variants')
  @Roles(Role.ADMIN, Role.STAFF)
  getVariants(@Param('modelId') modelId: string) {
    return this.partCatalogService.getVariants(modelId);
  }

  @Get('variants/:variantId/parts')
  @Roles(Role.ADMIN, Role.STAFF)
  getPartsForVariant(@Param('variantId') variantId: string) {
    return this.partCatalogService.getPartsForVariant(variantId);
  }

  @Get('checklist/vehicle/:vechileId')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Dismantling checklist for a vehicle invoice' })
  getChecklistForVehicle(@Param('vechileId') vechileId: string) {
    return this.partCatalogService.getChecklistForVehicle(vechileId);
  }

  @Get('checklist/mmv')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary:
      'Dismantling checklist by make/model/variant — creates model in catalog if new',
  })
  getChecklistByMmv(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('variant') variant?: string,
    @Query('vehicleType') vehicleType?: VehicleType,
  ) {
    return this.partCatalogService.getChecklistByMmv(
      make,
      model,
      variant,
      vehicleType,
    );
  }

  @Get('resolve')
  @Roles(Role.ADMIN, Role.STAFF)
  resolveMmv(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('variant') variant?: string,
  ) {
    return this.partCatalogService.resolveVariantFromMmv(make, model, variant);
  }

  @Post('variants/:variantId/parts')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Add a part to global catalog for this variant' })
  addPart(
    @Param('variantId') variantId: string,
    @Body() dto: AddVariantPartDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.partCatalogService.addPartToVariant(variantId, dto, user);
  }
}
