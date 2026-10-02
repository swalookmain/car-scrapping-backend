import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { OrganizationBooksSettings } from './organization-books-settings.schema';

@Injectable()
export class OrganizationBooksSettingsRepository extends BaseRepository<OrganizationBooksSettings> {
  constructor(
    @InjectModel(OrganizationBooksSettings.name)
    private readonly settingsModel: Model<OrganizationBooksSettings>,
  ) {
    super(settingsModel);
  }

  async findByOrganizationId(organizationId: string) {
    return this.settingsModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
    });
  }

  async upsertByOrganizationId(
    organizationId: string,
    set: Record<string, unknown>,
    unset: Record<string, 1> = {},
  ) {
    const update: Record<string, unknown> = {
      $setOnInsert: { organizationId: new Types.ObjectId(organizationId) },
    };
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }
    return this.settingsModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId) },
      update,
      { new: true, upsert: true },
    );
  }
}
