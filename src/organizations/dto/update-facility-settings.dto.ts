import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AuthorisedCapacityDto {
  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  L?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  M?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  N?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  OTHER?: number;
}

export class UpdateFacilitySettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validity?: string;

  @ApiPropertyOptional({ type: AuthorisedCapacityDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AuthorisedCapacityDto)
  @IsOptional()
  authorisedCapacity?: AuthorisedCapacityDto;
}
