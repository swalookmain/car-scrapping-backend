import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../src/common/enum/role.enum';
import { MODULE_IDS } from '../../src/common/access/app-modules';

/**
 * Test-only guard. Set header `x-test-role` to SUPER_ADMIN | ADMIN | STAFF.
 * Optional `x-test-modules` is a comma-separated list (STAFF).
 * Omit header or set `none` to simulate unauthenticated requests.
 */
@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roleHeader = req.headers['x-test-role'] as string | undefined;

    if (!roleHeader || roleHeader === 'none') {
      throw new UnauthorizedException('User not authenticated');
    }

    const modulesHeader = req.headers['x-test-modules'] as string | undefined;
    let allowedModules: string[] = [];
    if (roleHeader === Role.STAFF) {
      if (modulesHeader === undefined) {
        allowedModules = [...MODULE_IDS];
      } else if (modulesHeader === '' || modulesHeader === 'none') {
        allowedModules = [];
      } else {
        allowedModules = modulesHeader.split(',').map((id) => id.trim()).filter(Boolean);
      }
    }

    req.user = {
      userId: '507f1f77bcf86cd799439011',
      role: roleHeader as Role,
      orgId: '507f1f77bcf86cd799439012',
      email: 'rbac-test@example.com',
      name: 'RBAC Test User',
      allowedModules,
    };
    return true;
  }
}
