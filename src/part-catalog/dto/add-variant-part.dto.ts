import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CatalogPartCategory } from 'src/common/enum/catalogPartCategory.enum';

export class AddVariantPartDto {
  @ApiProperty()
  @IsString()
  partName: string;

  @ApiProperty({ description: 'Part category slug (stored lowercase)' })
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  partType: string;

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
