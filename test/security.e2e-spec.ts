import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createRbacTestApp } from './helpers/rbac-test-app.factory';
import { RBAC_MODULE_SETUPS } from './helpers/rbac-setups';
import { DashboardController } from '../src/dashboard/dashboard.controller';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { createServiceMock } from './helpers/service-mock';

describe('Security (e2e)', () => {
  describe('Authentication enforcement', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const setup = RBAC_MODULE_SETUPS.Dashboard;
      app = await createRbacTestApp(setup.controllers, setup.providers);
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects requests without token (401)', () => {
      return request(app.getHttpServer())
        .get('/dashboard/overview')
        .expect(401);
    });

    it('rejects invalid bearer token (401)', () => {
      return request(app.getHttpServer())
        .get('/dashboard/overview')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });
  });

  describe('Input validation', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createRbacTestApp(
        [DashboardController],
        [{ provide: DashboardService, useValue: createServiceMock() }],
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects unknown fields on validated DTOs (400)', async () => {
      const authSetup = RBAC_MODULE_SETUPS.Users;
      const authApp = await createRbacTestApp(
        authSetup.controllers,
        authSetup.providers,
      );
      const res = await request(authApp.getHttpServer())
        .post('/users/create')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ email: 'x@y.com', password: 'secret', hackerField: true });
      expect([400, 422]).toContain(res.status);
      await authApp.close();
    });
  });

  describe('Role isolation', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const setup = RBAC_MODULE_SETUPS.Organizations;
      app = await createRbacTestApp(setup.controllers, setup.providers);
    });

    afterAll(async () => {
      await app.close();
    });

    it('STAFF cannot list organizations (403)', () => {
      return request(app.getHttpServer())
        .get('/organizations')
        .set('x-test-role', 'STAFF')
        .expect(403);
    });

    it('SUPER_ADMIN cannot access org dashboard (403 on dashboard module)', async () => {
      const dashSetup = RBAC_MODULE_SETUPS.Dashboard;
      const dashApp = await createRbacTestApp(
        dashSetup.controllers,
        dashSetup.providers,
      );
      await request(dashApp.getHttpServer())
        .get('/dashboard/overview')
        .set('x-test-role', 'SUPER_ADMIN')
        .expect(403);
      await dashApp.close();
    });
  });
});
