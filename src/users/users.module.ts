import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UsersSchema } from './users.schema';
import { UsersRepository } from './users.repository';
import { SuperAdminBootstrap } from './super-admin.bootstrap';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UsersSchema }]),
    OrganizationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, SuperAdminBootstrap],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
