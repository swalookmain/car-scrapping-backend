import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './users.schema';
import { Model, Types } from 'mongoose';
import { Role } from 'src/common/enum/role.enum';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findByEmail(email: string) {
    console.log('emaillllll', email);
    // return this.userModel.findOne({ email }).select('+password');
    const user = await this.userModel.findOne({ email }).select('+password');
    console.log('userrrrrrrrr', user);
    return user;
  }

  async findByIdWithRefreshToken(id: string) {
    return this.userModel.findById(id).select('+refreshToken');
  }

  async findAdminByOrganization(organizationId: string) {
    return this.userModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
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
      organizationId: new Types.ObjectId(organizationId),
      role: Role.STAFF,
    });
  }
}
