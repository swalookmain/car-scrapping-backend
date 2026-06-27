import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../enum/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (user?: { role: Role }) => {
    const handler = jest.fn();
    return {
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no @Roles metadata is set', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: Role.STAFF }))).toBe(true);
  });

  it('allows access when user role is in allowed list', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Role.ADMIN, Role.STAFF]);
    expect(guard.canActivate(mockContext({ role: Role.STAFF }))).toBe(true);
  });

  it('denies access when user role is not in allowed list', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(mockContext({ role: Role.STAFF }))).toBe(false);
  });

  it('throws UnauthorizedException when user is missing', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Role.ADMIN]);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('does not treat SUPER_ADMIN as implicit ADMIN', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Role.ADMIN, Role.STAFF]);
    expect(guard.canActivate(mockContext({ role: Role.SUPER_ADMIN }))).toBe(
      false,
    );
  });
});
