import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RequestLoggerInterceptor } from './common/interceptor/request-logger.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { AuditLogInterceptor } from './common/interceptor/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware for secure cookie handling
  app.use(cookieParser());

  // Security: Helmet for HTTP headers
  app.use(
    helmet.default({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Security: CORS configuration
  // app.enableCors({
  //   origin: process.env.ALLOWED_ORIGINS?.split(',') || [
  //     'http://localhost:3000',
  //   ],
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // });
  app.enableCors({
  origin: true,
  credentials: true,
  methods: '*',
  allowedHeaders: '*',
});


  // Security: Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/refresh', authLimiter);

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(
    new RequestLoggerInterceptor(),
    app.get(AuditLogInterceptor),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ✅ Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Car Scrap Management API')
    .setDescription('Industry-grade Scrap Management Backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📄 Swagger available on http://localhost:${port}/docs`);
}

void bootstrap();
