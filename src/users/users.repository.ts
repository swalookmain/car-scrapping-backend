import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './users.schema';
import { Model } from 'mongoose';
import { Role } from 'src/common/enum/role.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string) {
    console.log('emaillllll', email);
    // return this.userModel.findOne({ email }).select('+password');
    const user = await this.userModel.findOne({ email }).select('+password');
    console.log('userrrrrrrrr', user);
    return user;
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  async findByIdWithRefreshToken(id: string) {
    return this.userModel.findById(id).select('+refreshToken');
  }

  async create(userData: Partial<User>) {
    return this.userModel.create(userData);
  }

  async update(id: string, updateData: Partial<User>) {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.userModel.find();
  }

  async findAllByFilter(filter: Partial<User>) {
    return this.userModel.find(filter);
  }

  async exists(filter: Partial<User>) {
    return this.userModel.exists(filter);
  }

  async findAdminByOrganization(organizationId: string) {
    return this.userModel.findOne({
      organizationId: organizationId,
      role: Role.ADMIN,
    });
  }
  async updateRefreshToken(id: string, refreshToken: string) {
    return this.userModel.findByIdAndUpdate(
      id,
      { refreshToken },
      { new: true },
    );
  }

  async findAllStaffByOrganization(organizationId: string) {
    return this.userModel.find({
      organizationId: organizationId,
      role: Role.STAFF,
    });
  }

  async findPaginated(filter: Partial<User>, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);
    return { data, total };
  }
}
