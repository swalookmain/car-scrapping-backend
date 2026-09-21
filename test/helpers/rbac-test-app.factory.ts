import {
  INestApplication,
  Provider,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { ModulesGuard } from '../../src/common/guards/modules.guard';
import { MockAuthGuard } from './mock-auth.guard';

export async function createRbacTestApp(
  controllers: Type<unknown>[],
  providers: Provider[],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers,
    providers: [...providers, Reflector, RolesGuard, ModulesGuard],
  })
    .overrideGuard(jwtAuthGuard)
    .useClass(MockAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}
