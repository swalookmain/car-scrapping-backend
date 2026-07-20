import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { OrganizationFacilitySettings } from './organization-facility-settings.schema';

@Injectable()
export class OrganizationFacilitySettingsRepository extends BaseRepository<OrganizationFacilitySettings> {
  constructor(
    @InjectModel(OrganizationFacilitySettings.name)
    private readonly settingsModel: Model<OrganizationFacilitySettings>,
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
      {
        $set: data,
        $setOnInsert: { organizationId: new Types.ObjectId(organizationId) },
      },
      { new: true, upsert: true },
    );
  }
}
