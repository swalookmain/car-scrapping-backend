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
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationRepo: OrganizationsRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
  ) {}

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

  private async attachSubscriptions(orgs: any[]) {
    if (!orgs?.length) return orgs;
    const ids = orgs.map((o) => String(o._id || o.id)).filter(Boolean);
    const subs = await this.subscriptionRepo.findLatestByOrganizationIds(ids);
    const byOrg = new Map(
      subs.map((s) => [
        String(s._id),
        {
          subscriptionType: s.type,
          plan: s.plan,
          endDate: s.endDate,
          status: s.status,
          startDate: s.startDate,
        },
      ]),
    );
    return orgs.map((org) => {
      const plain =
        typeof org.toObject === 'function' ? org.toObject() : { ...org };
      const sub = byOrg.get(String(plain._id || plain.id));
      return {
        ...plain,
        subscriptionType: sub?.subscriptionType ?? null,
        subscriptionPlan: sub?.plan ?? null,
        subscriptionEndDate: sub?.endDate ?? null,
        subscriptionStatus: sub?.status ?? null,
        subscriptionStartDate: sub?.startDate ?? null,
      };
    });
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
      const enriched = await this.attachSubscriptions(data);

      return {
        data: enriched,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      };
    }
    const all = await this.organizationRepo.findAll();
    return this.attachSubscriptions(all);
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
    const organization = await this.organizationRepo.updateById(
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
    const organization = await this.organizationRepo.deleteById(validatedId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return { message: 'Organization deleted successfully' };
  }
}
