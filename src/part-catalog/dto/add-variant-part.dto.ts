import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PartType } from 'src/common/enum/partType.enum';
import { CatalogPartCategory } from 'src/common/enum/catalogPartCategory.enum';

export class AddVariantPartDto {
  @ApiProperty()
  @IsString()
  partName: string;

  @ApiProperty({ enum: PartType })
  @IsEnum(PartType)
  partType: PartType;

  @ApiPropertyOptional({ enum: CatalogPartCategory, default: CatalogPartCategory.SALEABLE })
  @IsOptional()
  @IsEnum(CatalogPartCategory)
  category?: CatalogPartCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultQty?: number;
}
