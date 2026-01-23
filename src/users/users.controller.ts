import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enum/role.enum';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(jwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new admin user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createAdmin(createUserDto);
  }

  @Post('create-staff')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new staff user' })
  @ApiResponse({ status: 201, description: 'Staff user created successfully' })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or admin not assigned to organization',
  })
  async createStaff(
    @Body() createStaffDto: CreateStaffDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.usersService.createStaff(createStaffDto, authenticatedUser);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAllUser(@Query() query: PaginationQueryDto) {
    return this.usersService.findAllUser(query.page, query.limit);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch('update-refresh-token/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update refresh token for user' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token updated successfully',
  })
  async updateRefreshToken(
    @Param('id') id: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.usersService.updateRefreshToken(id, refreshToken);
  }

  @Get('find-all-staff-by-organization/:organizationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all staff by organization with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiResponse({ status: 200, description: 'Staff retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid organization ID' })
  async findAllStaffByOrganization(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.usersService.findAllStaffByOrganization(
      organizationId,
      query.page,
      query.limit,
    );
  }
}
