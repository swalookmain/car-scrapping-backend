import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../enum/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(ctx: ExecutionContext): boolean {
        const roles = this.reflector.get<Role[]>(
            'roles',
            ctx.getHandler(),
        );
        if (!roles) {
            return true;
        }

        const req = ctx.switchToHttp().getRequest();
        return roles.includes(req.user.role);

    }
}