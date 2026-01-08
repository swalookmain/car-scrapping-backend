import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { hashPassword } from 'src/common/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UsersRepository) {}

 async createAdmin(userData: Partial<any>) {
  try {
    const existingUser = await this.userRepo.findByEmail(userData.email);
    if(existingUser){
      throw new Error('User with this email already exists');
    }
    const passwordHash = await hashPassword(userData.password);
    userData.password = passwordHash;
    const user = await this.userRepo.create(userData);
    return user;
  } catch (error) {
    throw error;
  }
 }

 async createStaff(userData: Partial<any>) {
  try {
    const existingUser = await this.userRepo.findByEmail(userData.email);
    if(existingUser){
      throw new Error('User with this email already exists');
    }
    const passwordHash = await hashPassword(userData.password);
    userData.password = passwordHash;
    const user = await this.userRepo.create(userData);
    return user;
  } catch (error) {
    throw error;
  }
 }

  async findAllUser() {
    return this.userRepo.findAll();
  }

    async getByEmailwithPassword(email: string) {
        return this.userRepo.findByEmail(email);
    }

    async getById(id: string) {
        return this.userRepo.findById(id);
    }
  async update(id: string, updateData: Partial<any>) {
    return this.userRepo.update(id, updateData);
  }
  async remove(id: string) {
    return this.userRepo.delete(id);
  }

  async updateRefreshToken(id: string, refreshToken: string) {
      return this.userRepo.updateRefreshToken(id, refreshToken);
  }

  async findAllStaffByOrganization(organizationId: string) {
    return this.userRepo.findAllStaffByOrganization(organizationId);
  }
}
