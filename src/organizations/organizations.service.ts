import { Injectable } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationRepo: OrganizationsRepository
  ) {}

  async create(organizationData: Partial<any>) {
    try{
      const organization = await this.organizationRepo.create(organizationData);
      return organization;
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    return this.organizationRepo.findAll();
  }

  async getById(id: string) {
    return this.organizationRepo.findById(id);
  }

  async update(id: string, updateData: Partial<any>) {
    return this.organizationRepo.update(id, updateData);
  }

  async remove(id: string) {
    return this.organizationRepo.delete(id);
  }

}
