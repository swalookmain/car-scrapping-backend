import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UsersModule } from 'src/users/users.module';
import { StorageService } from 'src/common/services/storage.service';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadRepository } from './lead.repository';
import { LeadDocumentRepository } from './lead-document.repository';
import { Lead, LeadSchema } from './lead.schema';
import {
  LeadDocumentRecord,
  LeadDocumentRecordSchema,
} from './lead-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadDocumentRecord.name, schema: LeadDocumentRecordSchema },
    ]),
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [LeadController],
  providers: [
    LeadService,
    LeadRepository,
    LeadDocumentRepository,
    StorageService,
  ],
  exports: [LeadService, LeadRepository, LeadDocumentRepository],
})
export class LeadModule {}
