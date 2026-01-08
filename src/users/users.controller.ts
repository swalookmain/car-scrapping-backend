import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(jwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post('create')
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createAdmin(createUserDto);
  }

  @Post('create-staff')
  @Roles(Role.ADMIN)
  async createStaff(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createStaff(createUserDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  async findAllUser() {
    return this.usersService.findAllUser();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch('update-refresh-token/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateRefreshToken(@Param('id') id: string, @Body() refreshToken: string) {
    return this.usersService.updateRefreshToken(id, refreshToken);
  }

  @Get('find-all-staff-by-organization/:organizationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async findAllStaffByOrganization(@Param('organizationId') organizationId: string) {
    return this.usersService.findAllStaffByOrganization(organizationId);
  }
}
