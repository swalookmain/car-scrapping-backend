import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enum/role.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(jwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async create(
    @Body() createAuditLogDto: CreateAuditLogDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.auditLogService.create(createAuditLogDto, user.role);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all audit logs (Super Admin only)',
    description:
      'Super admin can see all audit logs including admin actions with full details',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'CREATE_ADMIN',
      'CREATE_STAFF',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_INVOICE',
      'UPDATE_INVOICE',
      'DELETE_INVOICE',
      'CREATE_VECHILE_INVOICE',
      'UPDATE_VECHILE_INVOICE',
      'DELETE_VECHILE_INVOICE',
      'REFRESH_TOKEN',
      'RESET_PASSWORD',
      'API_CALL',
    ],
  })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'FAILURE'] })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async findAllForSuperAdmin(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.findAllForSuperAdmin(query);
  }

  @Get('staff')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get staff audit logs (Admin only)',
    description:
      'Admin can see all staff audit logs from their organization with full details',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff audit logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'CREATE_STAFF',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_INVOICE',
      'UPDATE_INVOICE',
      'DELETE_INVOICE',
      'CREATE_VECHILE_INVOICE',
      'UPDATE_VECHILE_INVOICE',
      'DELETE_VECHILE_INVOICE',
      'REFRESH_TOKEN',
      'RESET_PASSWORD',
      'API_CALL',
    ],
  })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'FAILURE'] })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async findAllForAdmin(
    @Query() query: QueryAuditLogDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.auditLogService.findAllForAdmin(query, user);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.auditLogService.findById(id, user);
  }
}
