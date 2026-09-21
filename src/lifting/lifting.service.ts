import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { Role } from 'src/common/enum/role.enum';
import { LiftingJobStatus } from 'src/common/enum/liftingJobStatus.enum';
import { getPagination } from 'src/common/utils/pagination.util';
import { QueryLiftingDto } from './dto/query-lifting.dto';
import { andMongoFilters, staffLiftingOwnerFilter } from 'src/common/access/data-scope';
import { LiftingJobRepository } from './lifting-job.repository';

@Injectable()
export class LiftingService {
  constructor(private readonly liftingJobRepository: LiftingJobRepository) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return user.orgId;
  }

  async createForClosedLead(params: {
    organizationId: string;
    leadId: string;
    yardVehicleId?: string;
    assignedTo?: string;
    expectedArrivalAt?: Date;
    createdBy: string;
    snapshot?: Record<string, unknown>;
  }) {
    const existing = await this.liftingJobRepository.findByLeadId(
      params.organizationId,
      params.leadId,
    );
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (params.yardVehicleId && !existing.yardVehicleId) {
        patch.yardVehicleId = new Types.ObjectId(params.yardVehicleId);
      }
      if (params.assignedTo) {
        patch.assignedTo = new Types.ObjectId(params.assignedTo);
      }
      if (params.expectedArrivalAt) {
        patch.expectedArrivalAt = params.expectedArrivalAt;
      }
      if (params.snapshot) {
        patch.snapshot = params.snapshot;
      }
      if (Object.keys(patch).length === 0) {
        return existing;
      }
      return this.liftingJobRepository.updateById(
        existing._id.toString(),
        patch,
      );
    }

    return this.liftingJobRepository.create({
      organizationId: new Types.ObjectId(params.organizationId),
      leadId: new Types.ObjectId(params.leadId),
      yardVehicleId: params.yardVehicleId
        ? new Types.ObjectId(params.yardVehicleId)
        : undefined,
      assignedTo: params.assignedTo
        ? new Types.ObjectId(params.assignedTo)
        : undefined,
      expectedArrivalAt: params.expectedArrivalAt,
      snapshot: params.snapshot,
      status: LiftingJobStatus.PENDING,
      createdBy: new Types.ObjectId(params.createdBy),
    });
  }

  async completeByYardVehicleId(yardVehicleId: string) {
    const job =
      await this.liftingJobRepository.findByYardVehicleId(yardVehicleId);
    if (!job || job.status === LiftingJobStatus.COMPLETED) {
      return job;
    }
    return this.liftingJobRepository.updateById(job._id.toString(), {
      status: LiftingJobStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  private startOfToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private parseDay(value: string | undefined, endOfDay: boolean) {
    if (!value) {
      return undefined;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return undefined;
      }
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (endOfDay) {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  private dateFieldFilter(
    field: string,
    from?: string,
    to?: string,
    includeMissing = false,
  ): Record<string, unknown> | null {
    const gte = this.parseDay(from, false);
    const lte = this.parseDay(to, true);
    if (!gte && !lte) {
      return null;
    }
    const range: Record<string, Date> = {};
    if (gte) range.$gte = gte;
    if (lte) range.$lte = lte;
    if (!includeMissing) {
      return { [field]: range };
    }
    return {
      $or: [
        { [field]: range },
        { [field]: { $exists: false } },
        { [field]: null },
      ],
    };
  }

  private orgStaffFilter(authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    return andMongoFilters(
      { organizationId: new Types.ObjectId(orgId) },
      staffLiftingOwnerFilter(authenticatedUser),
    );
  }

  private tabStatusFilter(tab: string) {
    const startOfToday = this.startOfToday();
    if (tab === 'completed') {
      return { status: LiftingJobStatus.COMPLETED };
    }
    if (tab === 'overdue') {
      return {
        status: LiftingJobStatus.PENDING,
        expectedArrivalAt: { $lt: startOfToday, $exists: true },
      };
    }
    return { status: LiftingJobStatus.PENDING };
  }

  async findAll(query: QueryLiftingDto, authenticatedUser: AuthenticatedUser) {
    const { page, limit } = getPagination(query.page, query.limit);
    const tab = query.tab || 'pending';
    const dateField = tab === 'completed' ? 'completedAt' : 'expectedArrivalAt';
    const includeMissing = tab === 'pending';
    const filter = andMongoFilters(
      this.orgStaffFilter(authenticatedUser),
      this.tabStatusFilter(tab),
      this.dateFieldFilter(dateField, query.from, query.to, includeMissing),
    );

    const { data, total } = await this.liftingJobRepository.findPaginated(
      filter,
      page,
      limit,
      { createdAt: -1 },
      [
        { path: 'assignedTo', select: 'name email' },
        { path: 'leadId', select: 'name registrationNumber vehicleName status' },
      ],
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async summary(
    query: Pick<QueryLiftingDto, 'from' | 'to'>,
    authenticatedUser: AuthenticatedUser,
  ) {
    const scope = this.orgStaffFilter(authenticatedUser);
    const startOfToday = this.startOfToday();
    const pendingDate = this.dateFieldFilter(
      'expectedArrivalAt',
      query.from,
      query.to,
      true,
    );
    const overdueDate = this.dateFieldFilter(
      'expectedArrivalAt',
      query.from,
      query.to,
      false,
    );
    const completedDate = this.dateFieldFilter(
      'completedAt',
      query.from,
      query.to,
      false,
    );

    const [pending, upcoming, overdue, completed] = await Promise.all([
      this.liftingJobRepository.countByFilter(
        andMongoFilters(scope, { status: LiftingJobStatus.PENDING }, pendingDate),
      ),
      this.liftingJobRepository.countByFilter(
        andMongoFilters(
          scope,
          {
            status: LiftingJobStatus.PENDING,
            $or: [
              { expectedArrivalAt: { $exists: false } },
              { expectedArrivalAt: null },
              { expectedArrivalAt: { $gte: startOfToday } },
            ],
          },
          pendingDate,
        ),
      ),
      this.liftingJobRepository.countByFilter(
        andMongoFilters(
          scope,
          {
            status: LiftingJobStatus.PENDING,
            expectedArrivalAt: { $lt: startOfToday, $exists: true },
          },
          overdueDate,
        ),
      ),
      this.liftingJobRepository.countByFilter(
        andMongoFilters(
          scope,
          { status: LiftingJobStatus.COMPLETED },
          completedDate,
        ),
      ),
    ]);

    return { pending, upcoming, overdue, completed };
  }

  async findAssignedYardVehicleIds(authenticatedUser: AuthenticatedUser) {
    if (authenticatedUser.role !== Role.STAFF) {
      return [];
    }
    return this.liftingJobRepository.findYardVehicleIdsByAssignee(
      this.getOrgId(authenticatedUser),
      authenticatedUser.userId,
    );
  }

  async findOne(id: string, authenticatedUser: AuthenticatedUser) {
    const orgId = this.getOrgId(authenticatedUser);
    const job = await this.liftingJobRepository.findById(id, [
      { path: 'assignedTo', select: 'name email' },
      { path: 'leadId', select: 'name registrationNumber vehicleName status' },
    ]);
    if (!job || job.organizationId?.toString() !== orgId) {
      throw new NotFoundException('Lifting job not found');
    }
    if (
      authenticatedUser.role === Role.STAFF &&
      job.assignedTo?.toString() !== authenticatedUser.userId
    ) {
      throw new NotFoundException('Lifting job not found');
    }
    return job;
  }
}
