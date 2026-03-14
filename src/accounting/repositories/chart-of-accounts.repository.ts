import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  ChartOfAccount,
  ChartOfAccountDocument,
} from '../schemas/chart-of-accounts.schema';

@Injectable()
export class ChartOfAccountsRepository extends BaseRepository<ChartOfAccountDocument> {
  constructor(
    @InjectModel(ChartOfAccount.name)
    private readonly chartOfAccountModel: Model<ChartOfAccountDocument>,
  ) {
    super(chartOfAccountModel);
  }

  async findByOrganizationId(organizationId: string) {
    return this.chartOfAccountModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ accountType: 1, accountName: 1 })
      .lean();
  }

  async findByOrganizationAndName(
    organizationId: string,
    accountName: string,
  ): Promise<ChartOfAccountDocument | null> {
    return this.chartOfAccountModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      accountName,
    });
  }
}
