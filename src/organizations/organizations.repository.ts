import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { organizations } from './organizations.schema';
import { Model } from 'mongoose';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectModel(organizations.name)
    private readonly organizationModel: Model<organizations>,
  ) {}

  async create(organizationData: Partial<organizations>) {
    return this.organizationModel.create(organizationData);
  }

  async findById(id: string) {
    return this.organizationModel.findById(id);
  }

  async update(id: string, updateData: Partial<organizations>) {
    return this.organizationModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }

  async delete(id: string) {
    return this.organizationModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.organizationModel.find();
  }

  async findPaginated(
    filter: Partial<organizations>,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.organizationModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.organizationModel.countDocuments(filter),
    ]);
    return { data, total };
  }
}
