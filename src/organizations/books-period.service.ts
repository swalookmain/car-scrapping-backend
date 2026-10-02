import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject } from 'src/common/utils/security.util';
import { OrganizationBooksSettingsRepository } from './organization-books-settings.repository';
import { UpdateBooksSettingsDto } from './dto/update-books-settings.dto';
import { dateKeyToUtcDate, toBusinessDateKey } from './books-period.util';

export interface BooksPeriodView {
  organizationId: string;
  booksStartDate: string | null;
  today: string;
}

export interface AssertOpenOptions {
  /** Deadlines such as last lifting date may sit after today. */
  allowFuture?: boolean;
}

@Injectable()
export class BooksPeriodService {
  constructor(
    private readonly settingsRepo: OrganizationBooksSettingsRepository,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return user.orgId;
  }

  async getForUser(user: AuthenticatedUser): Promise<BooksPeriodView> {
    return this.getView(this.getOrgId(user));
  }

  async getView(organizationId: string): Promise<BooksPeriodView> {
    const existing = await this.settingsRepo.findByOrganizationId(organizationId);
    const today = toBusinessDateKey(new Date());
    return {
      organizationId,
      booksStartDate: existing?.booksStartDate
        ? toBusinessDateKey(existing.booksStartDate)
        : null,
      today,
    };
  }

  async updateForUser(user: AuthenticatedUser, dto: UpdateBooksSettingsDto) {
    const orgId = this.getOrgId(user);
    const sanitized = sanitizeObject(dto) as UpdateBooksSettingsDto;
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    const today = toBusinessDateKey(new Date());

    if (sanitized.booksStartDate !== undefined) {
      if (sanitized.booksStartDate == null || sanitized.booksStartDate === '') {
        unset.booksStartDate = 1;
      } else {
        const startKey = toBusinessDateKey(sanitized.booksStartDate);
        if (startKey > today) {
          throw new BadRequestException('Books start date cannot be in the future');
        }
        set.booksStartDate = dateKeyToUtcDate(startKey);
      }
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return this.getView(orgId);
    }

    await this.settingsRepo.upsertByOrganizationId(orgId, set, unset);
    return this.getView(orgId);
  }

  /**
   * No books start date: this is a no-op.
   * A start date limits the date to that day through today.
   */
  async assertOpen(
    organizationId: string,
    value: Date | string,
    fieldName: string,
    options?: AssertOpenOptions,
  ): Promise<void> {
    const settings = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings?.booksStartDate) {
      return;
    }

    const dateKey = toBusinessDateKey(value);

    const startKey = toBusinessDateKey(settings.booksStartDate);
    if (dateKey < startKey) {
      throw new BadRequestException(
        `${fieldName} is before the books start date (${startKey})`,
      );
    }

    if (!options?.allowFuture) {
      const today = toBusinessDateKey(new Date());
      if (dateKey > today) {
        throw new BadRequestException(`${fieldName} cannot be in the future`);
      }
    }
  }
}
