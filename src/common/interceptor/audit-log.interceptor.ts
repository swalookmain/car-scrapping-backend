import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { AuditAction } from 'src/common/enum/audit.enum';
import { Role } from 'src/common/enum/role.enum';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { isValidObjectId } from 'src/common/utils/security.util';
import { extractMetadataFromRequest } from 'src/auth/utils/metadata.util';
import { Types } from 'mongoose';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (!req) {
      return next.handle();
    }

    const resource = this.getResource(req);
    const resourceId = this.getResourceId(req);
    const metadata = extractMetadataFromRequest(req);
    const payload = this.buildPayload(req);

    const baseActor = this.getActor(req);
    let actorId = baseActor.actorId;
    let actorRole = baseActor.actorRole ?? Role.SYSTEM;
    let organizationId = baseActor.organizationId ?? null;

    const logAudit = async (
      status: 'SUCCESS' | 'FAILURE',
      errorMessage?: string,
    ) => {
      try {
        await this.auditLogService.create(
          {
            actorId: this.toObjectId(actorId),
            actorRole,
            organizationId: this.toObjectId(organizationId),
            action: this.getAction(req, status === 'SUCCESS'),
            resource,
            resourceId: this.toObjectId(resourceId),
            status,
            errorMessage,
            ip: metadata.ip,
            userAgent: metadata.userAgent,
            browser: metadata.browser,
            os: metadata.os,
            device: metadata.device,
            payload,
          },
          actorRole,
        );
      } catch (error) {
        this.logger.error(
          `Failed to write audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'AuditLogInterceptor',
        );
      }
    };

    return next.handle().pipe(
      tap((data: unknown) => {
        const statusCode = res?.statusCode ?? 200;
        const status: 'SUCCESS' | 'FAILURE' =
          statusCode >= 400 ? 'FAILURE' : 'SUCCESS';

        const responseUser = this.getResponseUser(data);
        if (!actorId && responseUser?.id) {
          actorId = responseUser.id;
          actorRole = responseUser.role ?? actorRole;
          organizationId = responseUser.orgId ?? organizationId;
        }

        void logAudit(status);
      }),
      catchError((err) => {
        void logAudit(
          'FAILURE',
          err instanceof Error ? err.message : 'Request failed',
        );
        const error = err instanceof Error ? err : new Error('Request failed');
        return throwError(() => error);
      }),
    );
  }

  private getActor(req: Request): {
    actorId: string | null;
    actorRole: Role | null;
    organizationId: string | null;
  } {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    if (!user) {
      return { actorId: null, actorRole: null, organizationId: null };
    }
    return {
      actorId: user.userId,
      actorRole: user.role,
      organizationId: user.orgId,
    };
  }

  private getResponseUser(
    data: unknown,
  ): { id?: string; role?: Role; orgId?: string | null } | null {
    if (!data || typeof data !== 'object' || !('user' in data)) {
      return null;
    }
    const user = (data as { user?: Record<string, unknown> }).user;
    if (!user || typeof user !== 'object') {
      return null;
    }
    const id = typeof user.id === 'string' ? user.id : undefined;
    const role = Object.values(Role).includes(user.role as Role)
      ? (user.role as Role)
      : undefined;
    const orgId =
      user.orgId === null || typeof user.orgId === 'string'
        ? (user.orgId as string | null)
        : undefined;
    return { id, role, orgId };
  }

  private getResource(req: Request): string {
    const path = req.originalUrl?.split('?')[0] || req.url;
    return `${req.method} ${path}`;
  }

  private getResourceId(req: Request): string | null {
    const id = req.params?.id;
    if (id && isValidObjectId(id)) {
      return id;
    }
    return null;
  }

  private toObjectId(id: string | null | undefined): Types.ObjectId | undefined {
    if (!id || !isValidObjectId(id)) {
      return undefined;
    }
    return new Types.ObjectId(id);
  }

  private getAction(req: Request, isSuccess: boolean): AuditAction {
    const method = req.method.toUpperCase();
    const path = req.originalUrl?.split('?')[0] || req.url;

    if (method === 'POST' && path === '/auth/login') {
      return isSuccess ? AuditAction.LOGIN_SUCCESS : AuditAction.LOGIN_FAILED;
    }
    if (method === 'POST' && path === '/auth/refresh') {
      return AuditAction.REFRESH_TOKEN;
    }
    if (method === 'POST' && path === '/auth/logout') {
      return AuditAction.LOGOUT;
    }

    if (method === 'POST' && path === '/users/create') {
      return AuditAction.CREATE_ADMIN;
    }
    if (method === 'POST' && path === '/users/create-staff') {
      return AuditAction.CREATE_STAFF;
    }
    if (method === 'PATCH' && /^\/users\/[^/]+$/.test(path)) {
      return AuditAction.UPDATE_USER;
    }
    if (method === 'DELETE' && /^\/users\/[^/]+$/.test(path)) {
      return AuditAction.DELETE_USER;
    }

    if (method === 'POST' && path === '/organizations') {
      return AuditAction.CREATE_ORGANIZATION;
    }

    if (method === 'POST' && path === '/invoice') {
      return AuditAction.CREATE_INVOICE;
    }
    if (method === 'POST' && path === '/invoice/vechile') {
      return AuditAction.CREATE_VECHILE_INVOICE;
    }
    if (method === 'POST' && path === '/invoice/purchase-documents') {
      return AuditAction.UPLOAD_PURCHASE_DOCUMENT;
    }
    if (method === 'PATCH' && /^\/invoice\/[^/]+$/.test(path)) {
      return AuditAction.UPDATE_INVOICE;
    }
    if (method === 'PATCH' && /^\/invoice\/vechile\/[^/]+$/.test(path)) {
      return AuditAction.UPDATE_VECHILE_INVOICE;
    }
    if (method === 'DELETE' && /^\/invoice\/[^/]+$/.test(path)) {
      return AuditAction.DELETE_INVOICE;
    }
    if (method === 'DELETE' && /^\/invoice\/vechile\/[^/]+$/.test(path)) {
      return AuditAction.DELETE_VECHILE_INVOICE;
    }

    return AuditAction.API_CALL;
  }

  private buildPayload(req: Request): Record<string, unknown> {
    const contentType = req.headers['content-type'] || '';
    const body =
      typeof contentType === 'string' &&
      contentType.toLowerCase().includes('multipart/form-data')
        ? '[omitted]'
        : this.sanitizePayload(req.body);

    return {
      params: this.sanitizePayload(req.params),
      query: this.sanitizePayload(req.query),
      body,
    };
  }

  private sanitizePayload(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizePayload(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (this.isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
        continue;
      }
      result[key] = this.sanitizePayload(item);
    }
    return result;
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return [
      'password',
      'refreshToken',
      'accessToken',
      'token',
      'authorization',
      'secret',
      'otp',
      'pin',
    ].some((sensitive) => lowerKey.includes(sensitive.toLowerCase()));
  }
}
