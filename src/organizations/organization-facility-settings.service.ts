import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject } from 'src/common/utils/security.util';
import { OrganizationFacilitySettingsRepository } from './organization-facility-settings.repository';
import { UpdateFacilitySettingsDto } from './dto/update-facility-settings.dto';

const DEFAULT_FACILITY = {
  name: '',
  registrationNumber: '',
  validity: '',
  authorisedCapacity: { L: 0, M: 0, N: 0, OTHER: 0 },
};

@Injectable()
export class OrganizationFacilitySettingsService {
  constructor(
    private readonly settingsRepo: OrganizationFacilitySettingsRepository,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return user.orgId;
  }

  async getForUser(user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    return this.getByOrganizationId(orgId);
  }

  async getByOrganizationId(organizationId: string) {
    const existing = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!existing) {
      return { organizationId, ...DEFAULT_FACILITY };
    }
    return existing;
  }

  async updateForUser(user: AuthenticatedUser, dto: UpdateFacilitySettingsDto) {
    const orgId = this.getOrgId(user);
    const sanitized = sanitizeObject(dto) as UpdateFacilitySettingsDto;
    return this.settingsRepo.upsertByOrganizationId(
      orgId,
      sanitized as Record<string, unknown>,
    );
  }
}
