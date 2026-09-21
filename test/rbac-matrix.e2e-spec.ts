import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ALL_TEST_ROLES,
  HttpMethod,
  RBAC_ROUTE_GROUPS,
  isRoleAllowed,
  requiresAuth,
} from './helpers/rbac-manifest';
import { RBAC_MODULE_SETUPS } from './helpers/rbac-setups';
import { createRbacTestApp } from './helpers/rbac-test-app.factory';
import { Role } from '../src/common/enum/role.enum';
import { AuditAction } from '../src/common/enum/audit.enum';

function send(
  app: INestApplication<App>,
  method: HttpMethod,
  path: string,
  role?: Role | 'none',
  modules?: string,
) {
  const agent = request(app.getHttpServer());
  let req = agent[method](path);
  if (role) {
    req = req.set('x-test-role', role);
  }
  if (modules !== undefined) {
    req = req.set('x-test-modules', modules);
  }
  return req;
}

describe('RBAC matrix (all modules × SUPER_ADMIN / ADMIN / STAFF)', () => {
  for (const group of RBAC_ROUTE_GROUPS) {
    const setup = RBAC_MODULE_SETUPS[group.name];
    if (!setup) {
      throw new Error(`Missing RBAC module setup for ${group.name}`);
    }

    describe(group.name, () => {
      let app: INestApplication<App>;

      beforeAll(async () => {
        app = await createRbacTestApp(setup.controllers, setup.providers);
      });

      afterAll(async () => {
        await app.close();
      });

      for (const route of group.routes) {
        const label = `${route.method.toUpperCase()} ${route.path}`;

        describe(label, () => {
          if (requiresAuth(route.access)) {
            it('rejects unauthenticated requests (401)', async () => {
              const res = await send(app, route.method, route.path);
              expect(res.status).toBe(401);
            });
          } else {
            it('allows unauthenticated access (public)', async () => {
              const res = await send(app, route.method, route.path);
              expect(res.status).not.toBe(401);
              expect(res.status).not.toBe(403);
            });
          }

          for (const role of ALL_TEST_ROLES) {
            const allowed = isRoleAllowed(route.access, role);

            it(
              allowed
                ? `allows ${role}`
                : `forbids ${role} (403)`,
              async () => {
                const res = await send(app, route.method, route.path, role);

                if (route.access === 'PUBLIC') {
                  expect(res.status).not.toBe(401);
                  expect(res.status).not.toBe(403);
                  return;
                }

                if (allowed) {
                  expect(res.status).not.toBe(401);
                  expect(res.status).not.toBe(403);
                } else {
                  expect(res.status).toBe(403);
                }
              },
            );
          }
        });
      }
    });
  }
});

describe('RBAC cross-cutting rules', () => {
  it('SUPER_ADMIN is not implicitly granted ADMIN/STAFF endpoints', async () => {
    const setup = RBAC_MODULE_SETUPS.Dashboard;
    const app = await createRbacTestApp(setup.controllers, setup.providers);
    const res = await send(
      app,
      'get',
      '/dashboard/overview',
      Role.SUPER_ADMIN,
    );
    expect(res.status).toBe(403);
    await app.close();
  });

  it('STAFF cannot access SUPER_ADMIN-only organization list', async () => {
    const orgSetup = RBAC_MODULE_SETUPS.Organizations;
    const app = await createRbacTestApp(orgSetup.controllers, orgSetup.providers);
    const res = await send(app, 'get', '/organizations', Role.STAFF);
    expect(res.status).toBe(403);
    await app.close();
  });

  it('JWT-only audit log POST allows all authenticated roles', async () => {
    const auditSetup = RBAC_MODULE_SETUPS.AuditLog;
    const app = await createRbacTestApp(
      auditSetup.controllers,
      auditSetup.providers,
    );

    for (const role of ALL_TEST_ROLES) {
      const res = await send(app, 'post', '/audit-logs', role).send({
        actorRole: role,
        action: AuditAction.LOGIN_SUCCESS,
        resource: 'auth',
        status: 'SUCCESS',
      });
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    }
    await app.close();
  });
});

describe('Staff module allow-list', () => {
  it('STAFF with yard can access yard and is forbidden on inventory', async () => {
    const yardApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Yard.controllers,
      RBAC_MODULE_SETUPS.Yard.providers,
    );
    const yardRes = await send(
      yardApp,
      'get',
      '/yard/vehicles',
      Role.STAFF,
      'yard',
    );
    expect(yardRes.status).not.toBe(401);
    expect(yardRes.status).not.toBe(403);
    await yardApp.close();

    const invApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Inventory.controllers,
      RBAC_MODULE_SETUPS.Inventory.providers,
    );
    const invRes = await send(invApp, 'get', '/inventory', Role.STAFF, 'yard');
    expect(invRes.status).toBe(403);
    await invApp.close();
  });

  it('STAFF without lifting is forbidden; with lifting can list jobs', async () => {
    const deniedApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Lifting.controllers,
      RBAC_MODULE_SETUPS.Lifting.providers,
    );
    const denied = await send(deniedApp, 'get', '/lifting', Role.STAFF, 'yard');
    expect(denied.status).toBe(403);
    await deniedApp.close();

    const allowedApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Lifting.controllers,
      RBAC_MODULE_SETUPS.Lifting.providers,
    );
    const allowed = await send(
      allowedApp,
      'get',
      '/lifting',
      Role.STAFF,
      'lifting',
    );
    expect(allowed.status).not.toBe(401);
    expect(allowed.status).not.toBe(403);
    await allowedApp.close();
  });

  it('STAFF with no modules is forbidden on staff APIs', async () => {
    const app = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Dashboard.controllers,
      RBAC_MODULE_SETUPS.Dashboard.providers,
    );
    const res = await send(app, 'get', '/dashboard/overview', Role.STAFF, 'none');
    expect(res.status).toBe(403);
    await app.close();
  });

  it('STAFF with leads can list org staff for assignment; yard-only cannot', async () => {
    const path = `/users/find-all-staff-by-organization/${'507f1f77bcf86cd799439012'}`;
    const allowedApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Users.controllers,
      RBAC_MODULE_SETUPS.Users.providers,
    );
    const allowed = await send(allowedApp, 'get', path, Role.STAFF, 'leads');
    expect(allowed.status).not.toBe(401);
    expect(allowed.status).not.toBe(403);
    await allowedApp.close();

    const deniedApp = await createRbacTestApp(
      RBAC_MODULE_SETUPS.Users.controllers,
      RBAC_MODULE_SETUPS.Users.providers,
    );
    const denied = await send(deniedApp, 'get', path, Role.STAFF, 'yard');
    expect(denied.status).toBe(403);
    await deniedApp.close();
  });
});
