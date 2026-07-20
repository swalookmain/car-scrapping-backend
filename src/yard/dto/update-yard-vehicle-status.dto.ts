import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';

export class UpdateYardVehicleStatusDto {
  @ApiProperty({ enum: YardVehicleStatus })
  @IsEnum(YardVehicleStatus)
  status: YardVehicleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whole vehicle weight in KG' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeightKg?: number;
}
