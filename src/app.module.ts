import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ConfigModule } from './config/config.module';
import { MongoDbModule } from './database/mongodb/mongodb.module';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuditLogInterceptor } from './common/interceptor/audit-log.interceptor';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ConfigModule,
    MongoDbModule,
    AuditLogModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuditLogInterceptor],
})
export class AppModule {}
