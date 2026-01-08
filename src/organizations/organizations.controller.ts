import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger/dist/decorators/api-bearer.decorator';
import { ApiTags } from '@nestjs/swagger/dist/decorators/api-use-tags.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

 @UseGuards(jwtAuthGuard, RolesGuard)
 @Roles(Role.SUPER_ADMIN)
 @Post()
 create(@Body() createOrganizationDto: CreateOrganizationDto) {
   return this.organizationsService.create(createOrganizationDto);
 }

  @UseGuards(jwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }
  @UseGuards(jwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.organizationsService.getById(id);
  }

  @UseGuards(jwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string,  @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @UseGuards(jwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

}
