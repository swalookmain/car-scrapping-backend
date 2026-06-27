import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../src/common/enum/role.enum';

/**
 * Test-only guard. Set header `x-test-role` to SUPER_ADMIN | ADMIN | STAFF.
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

    req.user = {
      userId: '507f1f77bcf86cd799439011',
      role: roleHeader as Role,
      orgId: '507f1f77bcf86cd799439012',
      email: 'rbac-test@example.com',
      name: 'RBAC Test User',
    };
    return true;
  }
}
