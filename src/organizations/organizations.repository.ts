import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { organizations } from './organizations.schema';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class OrganizationsRepository extends BaseRepository<organizations> {
  constructor(
    @InjectModel(organizations.name)
    private readonly organizationModel: Model<organizations>,
  ) {
    super(organizationModel);
  }
}
