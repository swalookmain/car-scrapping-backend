import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Types } from 'mongoose';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionType } from './enum/subscription-type.enum';
import { SubscriptionPlan } from './enum/subscription-plan.enum';
import { SubscriptionStatus } from './enum/subscription-status.enum';
import { SubscriptionCreatedBy } from './enum/subscription-created-by.enum';
import { SubscriptionInputDto } from './dto/subscription-input.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { validateObjectId } from 'src/common/utils/security.util';

export interface CreateSubscriptionOptions {
  organizationId: string;
  type: SubscriptionType;
  plan?: SubscriptionPlan | null;
  startDate: Date;
  endDate?: Date;
  createdBy: SubscriptionCreatedBy;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly organizationsRepo: OrganizationsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  startOfDayUtc(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
  }

  addYears(date: Date, years: number): Date {
    const d = new Date(date);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d;
  }

  calculateEndDate(
    type: SubscriptionType,
    plan: SubscriptionPlan | null | undefined,
    startDate: Date,
    endDateOverride?: Date,
  ): Date {
    if (endDateOverride) {
      return this.startOfDayUtc(endDateOverride);
    }

    const start = this.startOfDayUtc(startDate);

    if (type === SubscriptionType.TRIAL) {
      return this.addDays(start, 7);
    }

    if (!plan) {
      throw new BadRequestException('Plan is required for paid subscriptions');
    }

    switch (plan) {
      case SubscriptionPlan.MONTHLY:
        return this.addMonths(start, 1);
      case SubscriptionPlan.SIX_MONTH:
        return this.addMonths(start, 6);
      case SubscriptionPlan.YEARLY:
        return this.addYears(start, 1);
      default:
        throw new BadRequestException('Invalid subscription plan');
    }
  }

  parseDateInput(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return this.startOfDayUtc(parsed);
  }

  buildFromInput(
    input: SubscriptionInputDto,
    createdBy: SubscriptionCreatedBy,
  ): Omit<CreateSubscriptionOptions, 'organizationId'> {
    if (input.type === SubscriptionType.PAID && !input.plan) {
      throw new BadRequestException('Plan is required for paid subscriptions');
    }

    const startDate = this.parseDateInput(input.startDate);
    const endDateOverride = input.endDate
      ? this.parseDateInput(input.endDate)
      : undefined;

    const endDate = this.calculateEndDate(
      input.type,
      input.plan ?? null,
      startDate,
      endDateOverride,
    );

    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    return {
      type: input.type,
      plan: input.type === SubscriptionType.TRIAL ? null : (input.plan ?? null),
      startDate,
      endDate,
      createdBy,
    };
  }

  defaultTrialInput(startDate?: string): SubscriptionInputDto {
    return {
      type: SubscriptionType.TRIAL,
      startDate: startDate ?? new Date().toISOString().split('T')[0],
    };
  }

  async create(options: CreateSubscriptionOptions) {
    const validatedOrgId = validateObjectId(
      options.organizationId,
      'Organization ID',
    );

    const subscription = await this.subscriptionRepo.create({
      organizationId: new Types.ObjectId(validatedOrgId),
      type: options.type,
      plan: options.plan ?? null,
      startDate: options.startDate,
      endDate: options.endDate,
      status: SubscriptionStatus.ACTIVE,
      createdBy: options.createdBy,
    });

    await this.organizationsRepo.updateById(validatedOrgId, { isActive: true });

    return subscription;
  }

  async createOrUpdateForOrg(
    organizationId: string,
    input: SubscriptionInputDto,
    createdBy: SubscriptionCreatedBy,
  ) {
    const built = this.buildFromInput(input, createdBy);
    const existing =
      await this.subscriptionRepo.findLatestByOrganizationId(organizationId);

    if (existing) {
      return this.subscriptionRepo.updateById(existing._id.toString(), {
        type: built.type,
        plan: built.plan,
        startDate: built.startDate,
        endDate: built.endDate,
        status: SubscriptionStatus.ACTIVE,
        createdBy,
      });
    }

    return this.create({
      organizationId,
      ...built,
      endDate: built.endDate!,
    });
  }

  async getByOrganizationId(organizationId: string) {
    const validatedOrgId = validateObjectId(
      organizationId,
      'Organization ID',
    );
    const subscription =
      await this.subscriptionRepo.findLatestByOrganizationId(validatedOrgId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found for organization');
    }

    return subscription;
  }

  async update(organizationId: string, dto: UpdateSubscriptionDto) {
    const validatedOrgId = validateObjectId(
      organizationId,
      'Organization ID',
    );
    const existing =
      await this.subscriptionRepo.findLatestByOrganizationId(validatedOrgId);

    if (!existing) {
      throw new NotFoundException('Subscription not found for organization');
    }

    const type = dto.type ?? existing.type;
    const plan =
      dto.plan !== undefined
        ? dto.plan
        : type === SubscriptionType.TRIAL
          ? null
          : existing.plan;

    if (type === SubscriptionType.PAID && !plan) {
      throw new BadRequestException('Plan is required for paid subscriptions');
    }

    const startDate = dto.startDate
      ? this.parseDateInput(dto.startDate)
      : this.startOfDayUtc(existing.startDate);

    const endDate = dto.endDate
      ? this.parseDateInput(dto.endDate)
      : this.calculateEndDate(type, plan, startDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const status = dto.status ?? SubscriptionStatus.ACTIVE;

    const updated = await this.subscriptionRepo.updateById(
      existing._id.toString(),
      {
        type,
        plan: type === SubscriptionType.TRIAL ? null : plan,
        startDate,
        endDate,
        status,
      },
    );

    if (status === SubscriptionStatus.ACTIVE) {
      await this.organizationsRepo.updateById(validatedOrgId, {
        isActive: true,
      });
    }

    return updated;
  }

  isSubscriptionCurrentlyActive(subscription: {
    status: SubscriptionStatus;
    endDate: Date;
  }): boolean {
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }
    const today = this.startOfDayUtc(new Date());
    const end = this.startOfDayUtc(subscription.endDate);
    return end >= today;
  }

  async isOrgSubscriptionActive(organizationId: string): Promise<boolean> {
    const validatedOrgId = validateObjectId(
      organizationId,
      'Organization ID',
    );

    const org = await this.organizationsRepo.findById(validatedOrgId);
    if (!org || org.isActive === false) {
      return false;
    }

    const subscription =
      await this.subscriptionRepo.findLatestByOrganizationId(validatedOrgId);

    if (!subscription) {
      return false;
    }

    return this.isSubscriptionCurrentlyActive(subscription);
  }

  async expireDueSubscriptions(): Promise<number> {
    const today = this.startOfDayUtc(new Date());
    const due = await this.subscriptionRepo.findExpiredActive(today);

    for (const sub of due) {
      await this.subscriptionRepo.updateById(sub._id.toString(), {
        status: SubscriptionStatus.EXPIRED,
      });
      await this.organizationsRepo.updateById(sub.organizationId.toString(), {
        isActive: false,
      });
    }

    if (due.length > 0) {
      this.logger.log(
        `Expired ${due.length} subscriptions`,
        'SubscriptionService',
      );
    }

    return due.length;
  }

  async migrateOrganizationsWithoutSubscription(): Promise<number> {
    const orgs = await this.organizationsRepo.findAll();
    let migrated = 0;

    for (const org of orgs) {
      const orgId = org._id.toString();
      const existing =
        await this.subscriptionRepo.findLatestByOrganizationId(orgId);
      if (existing) continue;

      const startDate = this.startOfDayUtc(new Date());
      const endDate = this.addYears(startDate, 10);

      await this.create({
        organizationId: orgId,
        type: SubscriptionType.PAID,
        plan: SubscriptionPlan.YEARLY,
        startDate,
        endDate,
        createdBy: SubscriptionCreatedBy.SUPERADMIN,
      });

      migrated++;
    }

    if (migrated > 0) {
      this.logger.log(
        `Migrated ${migrated} organizations with default subscription`,
        'SubscriptionService',
      );
    }

    return migrated;
  }
}
