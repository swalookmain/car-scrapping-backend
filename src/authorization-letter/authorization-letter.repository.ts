import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  AuthorizationLetter,
  AuthorizationLetterDocument,
} from './authorization-letter.schema';

@Injectable()
export class AuthorizationLetterRepository extends BaseRepository<AuthorizationLetterDocument> {
  constructor(
    @InjectModel(AuthorizationLetter.name)
    letterModel: Model<AuthorizationLetterDocument>,
  ) {
    super(letterModel);
  }

  async findByOrgAndId(organizationId: string, id: string) {
    return this.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
  }

  async findByAuctionId(organizationId: string, auctionId: string) {
    return this.findOne({
      organizationId: new Types.ObjectId(organizationId),
      auctionId: new Types.ObjectId(auctionId),
    });
  }

  async findAllByOrg(organizationId: string) {
    return this.findAllByFilter({
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
