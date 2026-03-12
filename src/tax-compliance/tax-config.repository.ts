import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { TaxConfig, TaxConfigDocument } from './tax-config.schema';

@Injectable()
export class TaxConfigRepository extends BaseRepository<TaxConfigDocument> {
  constructor(
    @InjectModel(TaxConfig.name)
    private readonly taxConfigModel: Model<TaxConfigDocument>,
  ) {
    super(taxConfigModel);
  }

  async findByOrganizationId(organizationId: string) {
    return this.taxConfigModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
    });
  }
}
