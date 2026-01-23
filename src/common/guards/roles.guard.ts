import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enum/role.enum';
import { AuthenticatedUser } from '../interface/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.get<Role[]>('roles', ctx.getHandler());
    if (!roles) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return roles.includes(req.user.role);
  }
}
