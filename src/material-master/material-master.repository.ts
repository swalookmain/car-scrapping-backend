import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { MaterialMaster } from './material-master.schema';

@Injectable()
export class MaterialMasterRepository extends BaseRepository<MaterialMaster> {
  constructor(
    @InjectModel(MaterialMaster.name)
    private readonly materialModel: Model<MaterialMaster>,
  ) {
    super(materialModel);
  }

  async findActiveForOrg(organizationId: string) {
    const orgOid = new Types.ObjectId(organizationId);
    return this.materialModel
      .find({
        isActive: true,
        $or: [{ organizationId: null }, { organizationId: orgOid }],
      })
      .sort({ sortOrder: 1, label: 1 })
      .exec();
  }

  async findByCodeForOrg(code: string, organizationId: string) {
    const normalized = code.trim().toUpperCase();
    const orgOid = new Types.ObjectId(organizationId);
    return this.materialModel
      .findOne({
        code: normalized,
        isActive: true,
        $or: [{ organizationId: null }, { organizationId: orgOid }],
      })
      .sort({ organizationId: -1 })
      .exec();
  }

  async findSystemByCode(code: string) {
    return this.materialModel.findOne({
      code: code.trim().toUpperCase(),
      organizationId: null,
      isSystem: true,
    });
  }

  async upsertSystem(data: Partial<MaterialMaster>) {
    return this.materialModel.findOneAndUpdate(
      { code: data.code, organizationId: null },
      {
        $set: {
          ...data,
          organizationId: null,
          isSystem: true,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  async findOrgCustomByCode(organizationId: string, code: string) {
    return this.materialModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      code: code.trim().toUpperCase(),
    });
  }
}
