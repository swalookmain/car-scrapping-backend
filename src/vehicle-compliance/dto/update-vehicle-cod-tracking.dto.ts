import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';

export class UpdateVehicleCodTrackingDto {
  @ApiPropertyOptional({ description: 'Whether COD is generated' })
  @IsBoolean()
  @IsOptional()
  codGenerated?: boolean;

  @ApiPropertyOptional({ description: 'COD certificate document URL' })
  @IsString()
  @IsOptional()
  codDocumentUrl?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when COD was marked generated (ISO 8601)',
  })
  @ValidateIf((o: UpdateVehicleCodTrackingDto) => o.codGenerated === true)
  @IsDateString()
  @IsOptional()
  codGeneratedAt?: string;

  @ApiPropertyOptional({ description: 'Whether CVS certificate is generated' })
  @IsBoolean()
  @IsOptional()
  cvsGenerated?: boolean;

  @ApiPropertyOptional({ description: 'CVS certificate document URL' })
  @IsString()
  @IsOptional()
  cvsDocumentUrl?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when CVS was marked generated (ISO 8601)',
  })
  @ValidateIf((o: UpdateVehicleCodTrackingDto) => o.cvsGenerated === true)
  @IsDateString()
  @IsOptional()
  cvsGeneratedAt?: string;

  @ApiPropertyOptional({ description: 'RTO office name' })
  @IsString()
  @IsOptional()
  rtoOffice?: string;

  @ApiPropertyOptional({ enum: RtoStatus })
  @IsEnum(RtoStatus)
  @IsOptional()
  rtoStatus?: RtoStatus;

  @ApiPropertyOptional({ description: 'Internal remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
