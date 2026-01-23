import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import {
  validateObjectId,
  sanitizeObject,
} from 'src/common/utils/security.util';

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationRepo: OrganizationsRepository) {}

  async create(organizationData: Partial<any>) {
    try {
      const sanitizedData = sanitizeObject(organizationData);
      const organization = await this.organizationRepo.create(sanitizedData);
      return organization;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          'Organization with this name already exists',
        );
      }
      throw new BadRequestException('Failed to create organization');
    }
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<any> | any[]> {
    if (page !== undefined && limit !== undefined) {
      const { page: safePage, limit: safeLimit } = getPagination(page, limit);
      const { data, total } = await this.organizationRepo.findPaginated(
        {},
        safePage,
        safeLimit,
      );
      const totalPages = Math.ceil(total / safeLimit);

      return {
        data,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      };
    }
    return this.organizationRepo.findAll();
  }

  async getById(id: string) {
    const validatedId = validateObjectId(id, 'Organization ID');
    const organization = await this.organizationRepo.findById(validatedId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async update(id: string, updateData: Partial<any>) {
    const validatedId = validateObjectId(id, 'Organization ID');
    const sanitizedData = sanitizeObject(updateData);
    const organization = await this.organizationRepo.update(
      validatedId,
      sanitizedData,
    );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async remove(id: string) {
    const validatedId = validateObjectId(id, 'Organization ID');
    const organization = await this.organizationRepo.delete(validatedId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return { message: 'Organization deleted successfully' };
  }
}
