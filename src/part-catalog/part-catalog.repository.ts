import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CatalogPart, CatalogPartDocument } from './schemas/catalog-part.schema';
import { VehicleMake, VehicleMakeDocument } from './schemas/vehicle-make.schema';
import { VehicleModel, VehicleModelDocument } from './schemas/vehicle-model.schema';
import { VehicleVariant, VehicleVariantDocument } from './schemas/vehicle-variant.schema';
import {
  VariantPartMap,
  VariantPartMapDocument,
} from './schemas/variant-part-map.schema';
import {
  VehicleTypeTemplatePart,
  VehicleTypeTemplatePartDocument,
} from './schemas/vehicle-type-template-part.schema';

@Injectable()
export class PartCatalogRepository {
  constructor(
    @InjectModel(CatalogPart.name)
    private readonly catalogPartModel: Model<CatalogPartDocument>,
    @InjectModel(VehicleMake.name)
    private readonly makeModel: Model<VehicleMakeDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
    @InjectModel(VehicleVariant.name)
    private readonly variantModel: Model<VehicleVariantDocument>,
    @InjectModel(VariantPartMap.name)
    private readonly variantPartMapModel: Model<VariantPartMapDocument>,
    @InjectModel(VehicleTypeTemplatePart.name)
    private readonly templatePartModel: Model<VehicleTypeTemplatePartDocument>,
  ) {}

  countCatalogParts() {
    return this.catalogPartModel.countDocuments();
  }

  findAllMakes() {
    return this.makeModel.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  findModelsByMake(makeId: string) {
    return this.vehicleModelModel
      .find({ makeId: new Types.ObjectId(makeId), isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  findVariantsByModel(modelId: string) {
    return this.variantModel
      .find({ modelId: new Types.ObjectId(modelId), isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  findMakeBySlug(slug: string) {
    return this.makeModel.findOne({ slug: slug.toLowerCase(), isActive: true });
  }

  findModelByMakeAndSlug(makeId: Types.ObjectId, slug: string) {
    return this.vehicleModelModel.findOne({
      makeId,
      slug: slug.toLowerCase(),
      isActive: true,
    });
  }

  findVariantByModelAndSlug(modelId: Types.ObjectId, slug: string) {
    return this.variantModel.findOne({
      modelId,
      slug: slug.toLowerCase(),
      isActive: true,
    });
  }

  createMake(data: Partial<VehicleMake>) {
    return this.makeModel.create(data);
  }

  createVehicleModel(data: Partial<VehicleModel>) {
    return this.vehicleModelModel.create(data);
  }

  createVariant(data: Partial<VehicleVariant>) {
    return this.variantModel.create(data);
  }

  findCatalogPartByCode(code: string) {
    return this.catalogPartModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });
  }

  upsertCatalogPart(data: Partial<CatalogPart>) {
    return this.catalogPartModel.findOneAndUpdate(
      { code: data.code?.toUpperCase() },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  findVariantPartMaps(variantId: Types.ObjectId) {
    return this.variantPartMapModel
      .find({ variantId })
      .sort({ sortOrder: 1 })
      .populate('catalogPartId')
      .lean();
  }

  findTemplateParts(vehicleType: string) {
    return this.templatePartModel
      .find({ vehicleType })
      .sort({ sortOrder: 1 })
      .populate('catalogPartId')
      .lean();
  }

  upsertVariantPartMap(data: {
    variantId: Types.ObjectId;
    catalogPartId: Types.ObjectId;
    defaultQty: number;
    sortOrder: number;
    source: string;
    addedBy?: Types.ObjectId;
  }) {
    return this.variantPartMapModel.findOneAndUpdate(
      { variantId: data.variantId, catalogPartId: data.catalogPartId },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  upsertTemplatePart(data: {
    vehicleType: string;
    catalogPartId: Types.ObjectId;
    defaultQty: number;
    sortOrder: number;
  }) {
    return this.templatePartModel.findOneAndUpdate(
      { vehicleType: data.vehicleType, catalogPartId: data.catalogPartId },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  findVariantById(id: string) {
    return this.variantModel.findById(id).populate('modelId').lean();
  }
}
