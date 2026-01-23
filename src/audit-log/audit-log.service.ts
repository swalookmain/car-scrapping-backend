import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuditRepository, AuditLogFilter } from './audit.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { Role } from 'src/common/enum/role.enum';
import { getRetentionDate } from './utils/retention.util';
import { validateObjectId } from 'src/common/utils/security.util';
import { AuditLogDocument } from './audit.schema';
import { AuditAction } from 'src/common/enum/audit.enum';

export interface SanitizedAuditLog {
  id: string;
  actorId: string | null;
  actorRole: Role;
  organizationId: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  expireAt: Date;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly auditRepository: AuditRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(
    createAuditLogDto: CreateAuditLogDto,
    actorRole: Role,
  ): Promise<AuditLogDocument> {
    try {
      // Calculate expiration date based on actor role
      const expireAt = getRetentionDate(actorRole);

      const auditLogData = {
        ...createAuditLogDto,
        expireAt,
      };

      const auditLog = await this.auditRepository.create(auditLogData);

      this.logger.log(
        `Audit log created: ${createAuditLogDto.action} by ${createAuditLogDto.actorId ? createAuditLogDto.actorId.toString() : 'SYSTEM'}`,
        'AuditLogService',
      );

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuditLogService',
      );
      throw new BadRequestException('Failed to create audit log');
    }
  }

  async findAllForSuperAdmin(
    query: QueryAuditLogDto,
  ): Promise<PaginatedResponse<SanitizedAuditLog>> {
    const { page: safePage, limit: safeLimit } = getPagination(
      query.page,
      query.limit,
    );

    const filter: AuditLogFilter = {
      action: query.action,
      resource: query.resource,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const { data, total } = await this.auditRepository.findPaginated(
      filter,
      safePage,
      safeLimit,
    );

    const totalPages = Math.ceil(total / safeLimit);

    return {
      data: data.map((log) => this.sanitizeAuditLog(log)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      },
    };
  }

  async findAllForAdmin(
    query: QueryAuditLogDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<SanitizedAuditLog>> {
    if (!authenticatedUser.orgId) {
      throw new ForbiddenException('Admin must be assigned to an organization');
    }

    const { page: safePage, limit: safeLimit } = getPagination(
      query.page,
      query.limit,
    );

    // Admin can only see staff audit logs from their organization
    const filter: AuditLogFilter = {
      organizationId: validateObjectId(
        authenticatedUser.orgId,
        'Organization ID',
      ),
      action: query.action,
      resource: query.resource,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    // Get all audit logs from organization (we'll filter staff logs after)
    // First get total count of staff logs
    const allOrgLogs = await this.auditRepository.findWithFilters(filter);
    const allStaffLogs = allOrgLogs.filter(
      (log) => log.actorRole === Role.STAFF,
    );
    const totalStaffLogs = allStaffLogs.length;

    // Now get paginated staff logs
    const skip = (safePage - 1) * safeLimit;
    const paginatedStaffLogs = allStaffLogs.slice(skip, skip + safeLimit);

    const totalPages = Math.ceil(totalStaffLogs / safeLimit);

    this.logger.log(
      `Admin ${authenticatedUser.userId} retrieved ${paginatedStaffLogs.length} staff audit logs (page ${safePage} of ${totalPages})`,
      'AuditLogService',
    );

    return {
      data: paginatedStaffLogs.map((log) => this.sanitizeAuditLog(log)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total: totalStaffLogs,
        totalPages,
      },
    };
  }

  async findById(
    id: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<SanitizedAuditLog> {
    const validatedId = validateObjectId(id, 'Audit Log ID');
    const auditLog = await this.auditRepository.findById(validatedId);

    if (!auditLog) {
      throw new BadRequestException('Audit log not found');
    }

    // Super admin can see all logs
    if (authenticatedUser.role === Role.SUPER_ADMIN) {
      return this.sanitizeAuditLog(auditLog);
    }

    // Admin can only see logs from their organization
    if (authenticatedUser.role === Role.ADMIN) {
      if (!authenticatedUser.orgId) {
        throw new ForbiddenException(
          'Admin must be assigned to an organization',
        );
      }

      const logOrgId = auditLog.organizationId?.toString();
      if (logOrgId !== authenticatedUser.orgId) {
        throw new ForbiddenException(
          'You do not have permission to view this audit log',
        );
      }

      // Admin can only see staff logs
      if (auditLog.actorRole !== Role.STAFF) {
        throw new ForbiddenException('You can only view staff audit logs');
      }

      return this.sanitizeAuditLog(auditLog);
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private sanitizeAuditLog(log: AuditLogDocument): SanitizedAuditLog {
    const logId = log._id ? log._id.toString() : '';
    const actorId = log.actorId ? log.actorId.toString() : null;
    const organizationId = log.organizationId
      ? log.organizationId.toString()
      : null;
    const resourceId = log.resourceId ? log.resourceId.toString() : null;

    return {
      id: logId,
      actorId,
      actorRole: log.actorRole,
      organizationId,
      action: log.action,
      resource: log.resource,
      resourceId,
      status: log.status,
      errorMessage: log.errorMessage,
      ip: log.ip,
      userAgent: log.userAgent,
      browser: log.browser,
      os: log.os,
      device: log.device,
      payload: log.payload,
      createdAt: log.createdAt || new Date(),
      expireAt: log.expireAt,
    };
  }

  async deleteExpired(): Promise<number> {
    try {
      const deletedCount = await this.auditRepository.deleteExpired();
      this.logger.log(
        `Deleted ${deletedCount} expired audit logs`,
        'AuditLogService',
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete expired audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuditLogService',
      );
      throw new BadRequestException('Failed to delete expired audit logs');
    }
  }
}
