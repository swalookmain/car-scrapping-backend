import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { MaterialFormSection } from 'src/common/enum/materialFormSection.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { sanitizeObject } from 'src/common/utils/security.util';
import { CreateMaterialMasterDto } from './dto/create-material-master.dto';
import { MaterialMasterRepository } from './material-master.repository';
import { SYSTEM_MATERIALS } from './material-master.seed';

@Injectable()
export class MaterialMasterService implements OnModuleInit {
  constructor(private readonly materialRepo: MaterialMasterRepository) {}

  async onModuleInit() {
    await this.seedSystemMaterials();
  }

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return user.orgId;
  }

  async seedSystemMaterials() {
    for (const row of SYSTEM_MATERIALS) {
      await this.materialRepo.upsertSystem({
        code: row.code,
        label: row.label,
        formSection: row.formSection,
        matterClass: row.matterClass,
        defaultStateOfMatter: row.defaultStateOfMatter,
        sortOrder: row.sortOrder,
      });
    }
  }

  async listForUser(user: AuthenticatedUser) {
    return this.materialRepo.findActiveForOrg(this.getOrgId(user));
  }

  async resolveByCode(code: string | undefined, organizationId: string) {
    if (!code?.trim()) return null;
    return this.materialRepo.findByCodeForOrg(code, organizationId);
  }

  async createForOrg(user: AuthenticatedUser, dto: CreateMaterialMasterDto) {
    const orgId = this.getOrgId(user);
    const sanitized = sanitizeObject(dto) as CreateMaterialMasterDto;
    const code = sanitized.code.trim().toUpperCase();

    const system = await this.materialRepo.findSystemByCode(code);
    if (system) {
      throw new ConflictException(
        `Material code ${code} is a system FORM-3 material`,
      );
    }

    const existing = await this.materialRepo.findOrgCustomByCode(orgId, code);
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.label = sanitized.label;
        if (sanitized.formSection) existing.formSection = sanitized.formSection;
        if (sanitized.matterClass) existing.matterClass = sanitized.matterClass;
        if (sanitized.defaultStateOfMatter) {
          existing.defaultStateOfMatter = sanitized.defaultStateOfMatter;
        }
        await existing.save();
        return existing;
      }
      throw new ConflictException(`Material code ${code} already exists`);
    }

    return this.materialRepo.create({
      code,
      label: sanitized.label,
      formSection: sanitized.formSection ?? MaterialFormSection.OUTWARDS,
      matterClass: sanitized.matterClass ?? MatterClass.OTHER,
      defaultStateOfMatter: sanitized.defaultStateOfMatter,
      isSystem: false,
      isActive: true,
      organizationId: new Types.ObjectId(orgId),
      sortOrder: sanitized.sortOrder ?? 500,
    });
  }

  async deactivateForOrg(user: AuthenticatedUser, id: string) {
    const orgId = this.getOrgId(user);
    const doc = await this.materialRepo.findById(id);
    if (!doc) throw new NotFoundException('Material not found');
    if (doc.isSystem || !doc.organizationId) {
      throw new BadRequestException('System materials cannot be deactivated');
    }
    if (doc.organizationId.toString() !== orgId) {
      throw new NotFoundException('Material not found');
    }
    doc.isActive = false;
    await doc.save();
    return doc;
  }
}
