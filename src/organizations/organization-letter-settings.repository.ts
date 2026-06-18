import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { OrganizationLetterSettings } from './organization-letter-settings.schema';

@Injectable()
export class OrganizationLetterSettingsRepository extends BaseRepository<OrganizationLetterSettings> {
  constructor(
    @InjectModel(OrganizationLetterSettings.name)
    private readonly settingsModel: Model<OrganizationLetterSettings>,
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
    data: Record<string, unknown>,
  ) {
    return this.settingsModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId) },
      { $set: data, $setOnInsert: { organizationId: new Types.ObjectId(organizationId) } },
      { new: true, upsert: true },
    );
  }
}
