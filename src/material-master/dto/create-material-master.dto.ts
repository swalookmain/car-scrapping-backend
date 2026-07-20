import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MaterialFormSection } from 'src/common/enum/materialFormSection.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';

export class CreateMaterialMasterDto {
  @ApiProperty({ example: 'BRASS' })
  @IsString()
  @MinLength(2)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @ApiProperty({ example: 'Brass' })
  @IsString()
  @MinLength(1)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  label: string;

  @ApiProperty({ enum: MaterialFormSection, default: MaterialFormSection.OUTWARDS })
  @IsEnum(MaterialFormSection)
  @IsOptional()
  formSection?: MaterialFormSection;

  @ApiProperty({ enum: MatterClass, default: MatterClass.OTHER })
  @IsEnum(MatterClass)
  @IsOptional()
  matterClass?: MatterClass;

  @ApiPropertyOptional({ enum: StateOfMatter })
  @IsEnum(StateOfMatter)
  @IsOptional()
  defaultStateOfMatter?: StateOfMatter;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
