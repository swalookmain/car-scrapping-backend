import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogPart, CatalogPartSchema } from './schemas/catalog-part.schema';
import { VehicleMake, VehicleMakeSchema } from './schemas/vehicle-make.schema';
import { VehicleModel, VehicleModelSchema } from './schemas/vehicle-model.schema';
import { VehicleVariant, VehicleVariantSchema } from './schemas/vehicle-variant.schema';
import {
  VariantPartMap,
  VariantPartMapSchema,
} from './schemas/variant-part-map.schema';
import {
  VehicleTypeTemplatePart,
  VehicleTypeTemplatePartSchema,
} from './schemas/vehicle-type-template-part.schema';
import {
  PartCategory,
  PartCategorySchema,
} from './schemas/part-category.schema';
import { PartCatalogRepository } from './part-catalog.repository';
import { PartCatalogService } from './part-catalog.service';
import { PartCatalogController } from './part-catalog.controller';
import { InvoiceModule } from 'src/invoice/invoice.module';

@Module({
  imports: [
    InvoiceModule,
    MongooseModule.forFeature([
      { name: CatalogPart.name, schema: CatalogPartSchema },
      { name: VehicleMake.name, schema: VehicleMakeSchema },
      { name: VehicleModel.name, schema: VehicleModelSchema },
      { name: VehicleVariant.name, schema: VehicleVariantSchema },
      { name: VariantPartMap.name, schema: VariantPartMapSchema },
      {
        name: VehicleTypeTemplatePart.name,
        schema: VehicleTypeTemplatePartSchema,
      },
      { name: PartCategory.name, schema: PartCategorySchema },
    ]),
  ],
  controllers: [PartCatalogController],
  providers: [PartCatalogRepository, PartCatalogService],
  exports: [PartCatalogService, PartCatalogRepository],
})
export class PartCatalogModule {}
