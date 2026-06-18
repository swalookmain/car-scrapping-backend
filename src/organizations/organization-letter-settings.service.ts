import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject } from 'src/common/utils/security.util';
import { StorageService, UploadFile } from 'src/common/services/storage.service';
import { assertSupportedDocumentFile } from 'src/common/utils/document-upload.util';
import { OrganizationLetterSettingsRepository } from './organization-letter-settings.repository';
import { UpdateLetterSettingsDto } from './dto/update-letter-settings.dto';

const DEFAULT_SETTINGS = {
  legalName: '',
  tagline: 'A Govt. Regulated & Authorised RVSF',
  gstin: '',
  proprietorName: '',
  proprietorTitle: 'Proprietor',
  signatoryAddress: '',
  address: '',
  pinCode: '',
  mobileNumbers: [] as string[],
  email: '',
  website: '',
  logoUrl: '',
  rvsfLogoUrl: '',
  signatureUrl: '',
  buyerRefLabel: 'MSTC BUYER REF. NO.',
};

@Injectable()
export class OrganizationLetterSettingsService {
  constructor(
    private readonly settingsRepo: OrganizationLetterSettingsRepository,
    private readonly storageService: StorageService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return user.orgId;
  }

  async getForUser(user: AuthenticatedUser) {
    const orgId = this.getOrgId(user);
    const existing = await this.settingsRepo.findByOrganizationId(orgId);
    if (!existing) {
      return { organizationId: orgId, ...DEFAULT_SETTINGS };
    }
    return existing;
  }

  async updateForUser(user: AuthenticatedUser, dto: UpdateLetterSettingsDto) {
    const orgId = this.getOrgId(user);
    const sanitized = sanitizeObject(dto) as UpdateLetterSettingsDto;
    return this.settingsRepo.upsertByOrganizationId(
      orgId,
      sanitized as Record<string, unknown>,
    );
  }

  async getByOrganizationId(organizationId: string) {
    const existing = await this.settingsRepo.findByOrganizationId(organizationId);
    if (!existing) {
      return { organizationId, ...DEFAULT_SETTINGS };
    }
    return existing;
  }

  async uploadAsset(
    user: AuthenticatedUser,
    assetType: 'logo' | 'rvsfLogo' | 'signature',
    file: UploadFile,
  ) {
    const orgId = this.getOrgId(user);
    assertSupportedDocumentFile(file);
    const prefix = `letter-settings/${orgId}`;
    const upload = await this.storageService.uploadFile(file, prefix);

    const fieldMap = {
      logo: 'logoUrl',
      rvsfLogo: 'rvsfLogoUrl',
      signature: 'signatureUrl',
    } as const;

    return this.settingsRepo.upsertByOrganizationId(orgId, {
      [fieldMap[assetType]]: upload.url,
    });
  }
}
