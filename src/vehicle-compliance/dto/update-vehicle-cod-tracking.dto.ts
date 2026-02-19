import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';

export class UpdateVehicleCodTrackingDto {
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

  @ApiPropertyOptional({ description: 'Stored COD document URL' })
  @IsString()
  @IsOptional()
  codDocumentUrl?: string;
}
