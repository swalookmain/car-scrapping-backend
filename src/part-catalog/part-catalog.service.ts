import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { validateObjectId } from 'src/common/utils/security.util';
import { VehicleType } from 'src/common/enum/vehicleType.enum';
import { FuelType } from 'src/common/enum/fuelType.enum';
import {
  CatalogPartSource,
} from 'src/common/enum/catalogPartCategory.enum';
import { PartCatalogRepository } from './part-catalog.repository';
import {
  ALL_SEED_PARTS,
  SEED_VEHICLE_MODELS,
  VEHICLE_TYPE_TEMPLATE_CODES,
} from './data/catalog-seed.data';
import { AddVariantPartDto } from './dto/add-variant-part.dto';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { VehicleInvoiceRepository } from 'src/invoice/vehicle-invoice.repository';
import {
  formatPartTypeLabel,
  normalizePartType,
  SYSTEM_PART_TYPE_SLUGS,
} from 'src/common/utils/part-type.util';

@Injectable()
export class PartCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PartCatalogService.name);

  constructor(
    private readonly repo: PartCatalogRepository,
    private readonly vehicleInvoiceRepo: VehicleInvoiceRepository,
  ) {}

  async onModuleInit() {
    try {
      await this.seedPartCategories();
      const count = await this.repo.countCatalogParts();
      if (count === 0) {
        await this.seedCatalog();
        this.logger.log('Part catalog seeded successfully');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown seed error';
      this.logger.warn(`Part catalog seed skipped: ${message}`);
    }
  }

  private async seedPartCategories() {
    for (const slug of SYSTEM_PART_TYPE_SLUGS) {
      const existing = await this.repo.findPartCategoryBySlug(slug);
      if (existing) continue;
      await this.repo.createPartCategory({
        slug,
        label: formatPartTypeLabel(slug),
        isSystem: true,
        isActive: true,
      });
    }
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private codeFromName(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
  }

  async seedCatalog() {
    const partIdByCode = new Map<string, Types.ObjectId>();

    for (const part of ALL_SEED_PARTS) {
      const doc = await this.repo.upsertCatalogPart({
        code: part.code,
        name: part.name,
        partType: normalizePartType(part.partType),
        category: part.category,
        defaultQty: part.defaultQty ?? 1,
        sortOrder: part.sortOrder,
        isActive: true,
        ...(part.defaultMaterialCode
          ? {
              defaultMaterialCode: part.defaultMaterialCode,
              matterClass: part.matterClass as never,
              defaultStateOfMatter: part.defaultStateOfMatter as never,
              defaultWeightUnit: part.defaultWeightUnit as never,
            }
          : {}),
      });
      partIdByCode.set(part.code, doc._id as Types.ObjectId);
    }

    for (const [vehicleType, codes] of Object.entries(VEHICLE_TYPE_TEMPLATE_CODES)) {
      for (const code of codes) {
        const catalogPartId = partIdByCode.get(code);
        const seedPart = ALL_SEED_PARTS.find((p) => p.code === code);
        if (!catalogPartId || !seedPart) continue;
        await this.repo.upsertTemplatePart({
          vehicleType,
          catalogPartId,
          defaultQty: seedPart.defaultQty ?? 1,
          sortOrder: seedPart.sortOrder,
        });
      }
    }

    for (const row of SEED_VEHICLE_MODELS) {
      const make = await this.ensureMake(row.make);
      const model = await this.ensureModel(
        make._id as Types.ObjectId,
        row.model,
        row.vehicleType,
      );
      const variant = await this.ensureVariant(
        model._id as Types.ObjectId,
        row.variant || 'Standard',
      );
      await this.copyTemplateToVariant(
        variant._id as Types.ObjectId,
        row.vehicleType,
        CatalogPartSource.SEED,
      );
    }
  }

  private async ensureMake(name: string) {
    const slug = this.slugify(name);
    let make = await this.repo.findMakeBySlug(slug);
    if (!make) {
      make = await this.repo.createMake({ name: name.trim().toUpperCase(), slug });
    }
    return make;
  }

  private async ensureModel(
    makeId: Types.ObjectId,
    name: string,
    vehicleType: VehicleType,
  ) {
    const slug = this.slugify(name);
    let model = await this.repo.findModelByMakeAndSlug(makeId, slug);
    if (!model) {
      model = await this.repo.createVehicleModel({
        makeId,
        name: name.trim(),
        slug,
        vehicleType,
      });
    }
    return model;
  }

  private async ensureVariant(modelId: Types.ObjectId, name: string) {
    const slug = this.slugify(name || 'standard');
    let variant = await this.repo.findVariantByModelAndSlug(modelId, slug);
    if (!variant) {
      variant = await this.repo.createVariant({
        modelId,
        name: name.trim() || 'Standard',
        slug,
      });
    }
    return variant;
  }

  private async copyTemplateToVariant(
    variantId: Types.ObjectId,
    vehicleType: VehicleType,
    source: CatalogPartSource,
    addedBy?: Types.ObjectId,
  ) {
    const templates = await this.repo.findTemplateParts(vehicleType);
    for (const row of templates) {
      const part = row.catalogPartId as {
        _id: Types.ObjectId;
        defaultQty?: number;
        sortOrder?: number;
      };
      if (!part?._id) continue;
      await this.repo.upsertVariantPartMap({
        variantId,
        catalogPartId: part._id,
        defaultQty: row.defaultQty ?? part.defaultQty ?? 1,
        sortOrder: row.sortOrder ?? 0,
        source,
        addedBy,
      });
    }
  }

  private mapPartRow(
    catalogPart: {
      _id: Types.ObjectId;
      code: string;
      name: string;
      partType: string;
      category: string;
      defaultQty?: number;
    },
    defaultQty: number,
    sortOrder: number,
    source: string,
    variantId: Types.ObjectId,
  ) {
    return {
      catalogPartId: catalogPart._id.toString(),
      code: catalogPart.code,
      partName: catalogPart.name,
      partType: normalizePartType(catalogPart.partType),
      category: catalogPart.category,
      defaultQty,
      sortOrder,
      source,
      variantId: variantId.toString(),
      included: catalogPart.category !== 'SCRAP',
      defaultStateOfMatter: (catalogPart as { defaultStateOfMatter?: string })
        .defaultStateOfMatter,
      defaultMaterialCode: (catalogPart as { defaultMaterialCode?: string })
        .defaultMaterialCode,
      matterClass: (catalogPart as { matterClass?: string }).matterClass,
      defaultWeightUnit: (catalogPart as { defaultWeightUnit?: string })
        .defaultWeightUnit,
    };
  }

  async getMakes() {
    return this.repo.findAllMakes();
  }

  async getPartCategories() {
    const rows = await this.repo.findAllPartCategories();
    return rows.map((row) => ({
      slug: row.slug,
      label: row.label || formatPartTypeLabel(row.slug),
      isSystem: row.isSystem ?? false,
    }));
  }

  async createPartCategory(dto: CreatePartCategoryDto) {
    const slug = normalizePartType(dto.name);
    if (!slug) {
      throw new BadRequestException('Category name is required');
    }
    const existing = await this.repo.findPartCategoryBySlug(slug);
    if (existing) {
      throw new BadRequestException('Category already exists');
    }
    const created = await this.repo.createPartCategory({
      slug,
      label: formatPartTypeLabel(slug),
      isSystem: false,
      isActive: true,
    });
    return {
      slug: created.slug,
      label: created.label,
      isSystem: false,
    };
  }

  private async ensurePartCategory(slug: string) {
    const normalized = normalizePartType(slug);
    let category = await this.repo.findPartCategoryBySlug(normalized);
    if (!category) {
      category = await this.repo.createPartCategory({
        slug: normalized,
        label: formatPartTypeLabel(normalized),
        isSystem: false,
        isActive: true,
      });
    }
    return category;
  }

  async getModels(makeId: string) {
    validateObjectId(makeId, 'Make ID');
    return this.repo.findModelsByMake(makeId);
  }

  async getVariants(modelId: string) {
    validateObjectId(modelId, 'Model ID');
    return this.repo.findVariantsByModel(modelId);
  }

  async resolveVariantFromMmv(
    make: string,
    model: string,
    variant?: string,
    vehicleType?: VehicleType,
    fuelType?: FuelType,
  ) {
    const makeDoc = await this.ensureMake(make);
    const modelDoc = await this.ensureModel(
      makeDoc._id as Types.ObjectId,
      model,
      vehicleType || VehicleType.CAR,
    );
    const variantDoc = await this.ensureVariant(
      modelDoc._id as Types.ObjectId,
      variant?.trim() || 'Standard',
    );

    const existingMaps = await this.repo.findVariantPartMaps(
      variantDoc._id as Types.ObjectId,
    );
    if (!existingMaps.length) {
      await this.copyTemplateToVariant(
        variantDoc._id as Types.ObjectId,
        modelDoc.vehicleType as VehicleType,
        CatalogPartSource.GENERIC,
      );
    }

    return {
      make: makeDoc,
      model: modelDoc,
      variant: variantDoc,
    };
  }

  private async buildChecklistResponse(
    resolved: Awaited<ReturnType<PartCatalogService['resolveVariantFromMmv']>>,
    vehicleInfo: Record<string, unknown>,
  ) {
    const variantId = (resolved.variant._id as Types.ObjectId).toString();
    const parts = await this.getPartsForVariant(variantId);
    const maps = await this.repo.findVariantPartMaps(
      resolved.variant._id as Types.ObjectId,
    );
    const hasModelSpecificParts = maps.some(
      (m) =>
        m.source === CatalogPartSource.USER || m.source === CatalogPartSource.SEED,
    );

    return {
      vehicle: vehicleInfo,
      catalog: {
        makeId: (resolved.make._id as Types.ObjectId).toString(),
        modelId: (resolved.model._id as Types.ObjectId).toString(),
        variantId,
        makeName: resolved.make.name,
        modelName: resolved.model.name,
        variantName: resolved.variant.name,
        vehicleType: resolved.model.vehicleType,
      },
      parts,
      meta: {
        /** True when this model/variant only has generic master parts (not yet customized) */
        usesGenericMaster: !hasModelSpecificParts,
        hasUserAddedParts: maps.some((m) => m.source === CatalogPartSource.USER),
      },
    };
  }

  async getChecklistByMmv(
    make: string,
    model: string,
    variant?: string,
    vehicleType?: VehicleType,
  ) {
    if (!make?.trim() || !model?.trim()) {
      throw new BadRequestException('Make and model are required');
    }
    const resolved = await this.resolveVariantFromMmv(
      make.trim(),
      model.trim(),
      variant?.trim() || 'Standard',
      vehicleType || VehicleType.CAR,
    );
    return this.buildChecklistResponse(resolved, {
      make: make.trim(),
      model: model.trim(),
      variant: variant?.trim() || 'Standard',
      vehicleType: vehicleType || resolved.model.vehicleType,
    });
  }

  async getPartsForVariant(variantId: string) {
    const id = validateObjectId(variantId, 'Variant ID');
    const variant = await this.repo.findVariantById(id);
    if (!variant) throw new NotFoundException('Variant not found');

    const maps = await this.repo.findVariantPartMaps(new Types.ObjectId(id));
    if (!maps.length) {
      const model = variant.modelId as { vehicleType?: VehicleType };
      await this.copyTemplateToVariant(
        new Types.ObjectId(id),
        (model?.vehicleType as VehicleType) || VehicleType.CAR,
        CatalogPartSource.GENERIC,
      );
      return this.getPartsForVariant(variantId);
    }

    return maps
      .filter((m) => m.catalogPartId && typeof m.catalogPartId === 'object')
      .map((m) => {
        const part = m.catalogPartId as unknown as {
          _id: Types.ObjectId;
          code: string;
          name: string;
          partType: string;
          category: string;
        };
        return this.mapPartRow(
          part,
          m.defaultQty ?? 1,
          m.sortOrder ?? 0,
          m.source,
          new Types.ObjectId(id),
        );
      });
  }

  async getChecklistForVehicle(vechileId: string) {
    const id = validateObjectId(vechileId, 'Vehicle ID');
    const vehicle = await this.vehicleInvoiceRepo.findById(id);
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const vehicleType = (vehicle.vehicle_type as VehicleType) || VehicleType.CAR;
    const resolved = await this.resolveVariantFromMmv(
      vehicle.make,
      vehicle.model_name,
      vehicle.variant,
      vehicleType,
      vehicle.fuel_type as FuelType,
    );

    const response = await this.buildChecklistResponse(resolved, {
      vechileId: id,
      make: vehicle.make,
      model: vehicle.model_name,
      variant: vehicle.variant,
      vehicleType,
      registrationNumber: vehicle.registration_number,
    });

    const orgId = vehicle.organizationId?.toString();
    if (orgId && Array.isArray(response.parts) && response.parts.length) {
      const ids = response.parts
        .map((p: { catalogPartId?: string }) => p.catalogPartId)
        .filter(Boolean) as string[];
      const defaults = await this.getOrgDefaultsMap(orgId, ids);
      response.parts = response.parts.map(
        (p: {
          catalogPartId?: string;
          defaultStateOfMatter?: string;
          defaultMaterialCode?: string;
          matterClass?: string;
          defaultWeightUnit?: string;
        }) => {
          const d = p.catalogPartId ? defaults.get(p.catalogPartId) : undefined;
          if (!d) return p;
          return {
            ...p,
            defaultStateOfMatter: d.stateOfMatter || p.defaultStateOfMatter,
            defaultMaterialCode: d.materialCode || p.defaultMaterialCode,
            matterClass: d.matterClass || p.matterClass,
            defaultWeightUnit: d.weightUnit || p.defaultWeightUnit,
            stateOfMatter: d.stateOfMatter || p.defaultStateOfMatter,
            materialCode: d.materialCode || p.defaultMaterialCode,
          };
        },
      );
    }

    return response;
  }

  async addPartToVariant(
    variantId: string,
    dto: AddVariantPartDto,
    user: AuthenticatedUser,
  ) {
    const id = validateObjectId(variantId, 'Variant ID');
    const variant = await this.repo.findVariantById(id);
    if (!variant) throw new NotFoundException('Variant not found');

    const name = dto.partName.trim();
    if (!name) throw new BadRequestException('Part name is required');

    const partType = normalizePartType(dto.partType);
    await this.ensurePartCategory(partType);

    const code = (dto.code?.trim() || this.codeFromName(name)).toUpperCase();
    const existing = await this.repo.findCatalogPartByCode(code);
    const catalogPart =
      existing ||
      (await this.repo.upsertCatalogPart({
        code,
        name,
        partType,
        category: dto.category,
        defaultQty: dto.defaultQty ?? 1,
        sortOrder: 900,
        isActive: true,
      }));

    const sortOrder = 900 + Math.floor(Math.random() * 100);
    await this.repo.upsertVariantPartMap({
      variantId: new Types.ObjectId(id),
      catalogPartId: catalogPart._id as Types.ObjectId,
      defaultQty: dto.defaultQty ?? catalogPart.defaultQty ?? 1,
      sortOrder,
      source: CatalogPartSource.USER,
      addedBy: new Types.ObjectId(user.userId),
    });

    return this.mapPartRow(
      catalogPart as {
        _id: Types.ObjectId;
        code: string;
        name: string;
        partType: string;
        category: string;
      },
      dto.defaultQty ?? 1,
      sortOrder,
      CatalogPartSource.USER,
      new Types.ObjectId(id),
    );
  }

  async rememberOrgDefaults(
    organizationId: string,
    catalogPartId: string,
    data: {
      stateOfMatter?: string;
      materialCode?: string;
      matterClass?: string;
      weightUnit?: string;
    },
  ) {
    if (!organizationId || !catalogPartId) return null;
    return this.repo.upsertOrgDefaults(organizationId, catalogPartId, data);
  }

  async getOrgDefaultsMap(
    organizationId: string,
    catalogPartIds: string[],
  ): Promise<
    Map<
      string,
      {
        stateOfMatter?: string;
        materialCode?: string;
        matterClass?: string;
        weightUnit?: string;
      }
    >
  > {
    const rows = await this.repo.findOrgDefaultsForParts(
      organizationId,
      catalogPartIds,
    );
    const map = new Map<
      string,
      {
        stateOfMatter?: string;
        materialCode?: string;
        matterClass?: string;
        weightUnit?: string;
      }
    >();
    for (const row of rows) {
      map.set(row.catalogPartId.toString(), {
        stateOfMatter: row.stateOfMatter,
        materialCode: row.materialCode,
        matterClass: row.matterClass,
        weightUnit: row.weightUnit,
      });
    }
    return map;
  }
}
