import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit.schema';
import { AuditRepository } from './audit.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditRepository],
  exports: [AuditLogService, AuditRepository],
})
export class AuditLogModule {}
