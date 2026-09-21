import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModulesGuard } from './modules.guard';
import { Role } from '../enum/role.enum';
import {
  REQUIRE_ANY_ASSIGNED_MODULE_KEY,
  SET_MODULE_KEY,
  SKIP_MODULE_CHECK_KEY,
} from '../access/access.constants';

describe('ModulesGuard', () => {
  let guard: ModulesGuard;
  let reflector: Reflector;

  const mockContext = (user?: {
    role: Role;
    allowedModules?: string[];
  }) => {
    const handler = jest.fn();
    return {
      getHandler: () => handler,
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ModulesGuard(reflector);
  });

  it('allows when @SkipModuleCheck is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SKIP_MODULE_CHECK_KEY) return true;
      return undefined;
    });
    expect(guard.canActivate(mockContext({ role: Role.STAFF, allowedModules: [] }))).toBe(
      true,
    );
  });

  it('allows when user is missing (auth handled elsewhere)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext(undefined))).toBe(true);
  });

  it('allows ADMIN regardless of modules', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['yard'];
      return undefined;
    });
    expect(guard.canActivate(mockContext({ role: Role.ADMIN, allowedModules: [] }))).toBe(
      true,
    );
  });

  it('denies STAFF with empty modules', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['yard'];
      return undefined;
    });
    expect(() =>
      guard.canActivate(mockContext({ role: Role.STAFF, allowedModules: [] })),
    ).toThrow(ForbiddenException);
  });

  it('denies STAFF when controller has no @SetModule', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(() =>
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['yard'] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows STAFF when granted module matches', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['yard'];
      return undefined;
    });
    expect(
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['yard'] }),
      ),
    ).toBe(true);
  });

  it('denies STAFF when granted module does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['inventory'];
      return undefined;
    });
    expect(() =>
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['yard'] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('require-any allows STAFF with at least one module', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_ANY_ASSIGNED_MODULE_KEY) return true;
      return undefined;
    });
    expect(
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['yard'] }),
      ),
    ).toBe(true);
  });

  it('require-any denies STAFF with zero modules', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_ANY_ASSIGNED_MODULE_KEY) return true;
      return undefined;
    });
    expect(() =>
      guard.canActivate(mockContext({ role: Role.STAFF, allowedModules: [] })),
    ).toThrow(ForbiddenException);
  });

  it('allows STAFF when granted lifting module', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['lifting'];
      return undefined;
    });
    expect(
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['lifting'] }),
      ),
    ).toBe(true);
  });

  it('denies STAFF lifting when module is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === SET_MODULE_KEY) return ['lifting'];
      return undefined;
    });
    expect(() =>
      guard.canActivate(
        mockContext({ role: Role.STAFF, allowedModules: ['yard'] }),
      ),
    ).toThrow(ForbiddenException);
  });
});
