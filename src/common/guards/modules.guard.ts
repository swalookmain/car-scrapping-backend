import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enum/role.enum';
import { AuthenticatedUser } from '../interface/authenticated-user.interface';
import {
  REQUIRE_ANY_ASSIGNED_MODULE_KEY,
  SET_MODULE_KEY,
  SKIP_MODULE_CHECK_KEY,
} from '../access/access.constants';

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_MODULE_CHECK_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (skip) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      return true;
    }

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const granted = new Set(user.allowedModules ?? []);

    const requireAny = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ANY_ASSIGNED_MODULE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (requireAny) {
      if (granted.size === 0) {
        throw new ForbiddenException('No modules assigned');
      }
      return true;
    }

    const moduleIds =
      this.reflector.getAllAndOverride<string[]>(SET_MODULE_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    if (moduleIds.length === 0) {
      throw new ForbiddenException('Module access is not configured');
    }

    const allowed = moduleIds.some((id) => granted.has(id));
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this module');
    }
    return true;
  }
}
