import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { UsersModule } from 'src/users/users.module';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadRepository } from './lead.repository';
import { LeadDocumentRepository } from './lead-document.repository';
import { Lead, LeadSchema } from './lead.schema';
import {
  LeadDocumentRecord,
  LeadDocumentRecordSchema,
} from './lead-document.schema';
import { YardModule } from 'src/yard/yard.module';
import { LiftingModule } from 'src/lifting/lifting.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadDocumentRecord.name, schema: LeadDocumentRecordSchema },
    ]),
    OrganizationsModule,
    UsersModule,
    forwardRef(() => YardModule),
    LiftingModule,
  ],
  controllers: [LeadController],
  providers: [LeadService, LeadRepository, LeadDocumentRepository],
  exports: [LeadService, LeadRepository, LeadDocumentRepository],
})
export class LeadModule {}
