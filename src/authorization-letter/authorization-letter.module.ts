import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuctionModule } from 'src/auction/auction.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuthorizationLetterController } from './authorization-letter.controller';
import { AuthorizationLetterService } from './authorization-letter.service';
import { AuthorizationLetterRepository } from './authorization-letter.repository';
import {
  AuthorizationLetter,
  AuthorizationLetterSchema,
} from './authorization-letter.schema';
import {
  AuthorizationLetterCounter,
  AuthorizationLetterCounterSchema,
} from './authorization-letter-counter.schema';
import { AuthorizationLetterCounterRepository } from './authorization-letter-counter.repository';

@Module({
  imports: [
    AuctionModule,
    OrganizationsModule,
    MongooseModule.forFeature([
      { name: AuthorizationLetter.name, schema: AuthorizationLetterSchema },
      {
        name: AuthorizationLetterCounter.name,
        schema: AuthorizationLetterCounterSchema,
      },
    ]),
  ],
  controllers: [AuthorizationLetterController],
  providers: [
    AuthorizationLetterService,
    AuthorizationLetterRepository,
    AuthorizationLetterCounterRepository,
  ],
  exports: [AuthorizationLetterService],
})
export class AuthorizationLetterModule {}
