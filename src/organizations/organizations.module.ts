import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { organizations, organizationsSchema } from './organizations.schema';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { OrganizationsRepository } from './organizations.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: organizations.name, schema: organizationsSchema }]),

  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository],
  exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}
