import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';

export class CreateVehicleCodRecordDto {
  @ApiProperty({
    description:
      'Canonical vehicle id (YardVehicle). Required for all COD creates.',
  })
  @IsMongoId()
  yardVehicleId: string;

  @ApiPropertyOptional({
    description: 'Optional legacy purchase vehicle-invoice link',
  })
  @IsMongoId()
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Optional purchase invoice link' })
  @IsMongoId()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ description: 'Whether COD is generated' })
  @IsBoolean()
  codGenerated: boolean;

  @ApiPropertyOptional({
    description: 'Mandatory when codGenerated is true',
  })
  @ValidateIf(
    (data: CreateVehicleCodRecordDto) => data.codGenerated === true,
  )
  @IsString()
  codInwardNumber?: string;

  @ApiPropertyOptional({
    description: 'Mandatory when codGenerated is true (ISO 8601)',
  })
  @ValidateIf(
    (data: CreateVehicleCodRecordDto) => data.codGenerated === true,
  )
  @IsDateString()
  codIssueDate?: string;

  @ApiPropertyOptional({ description: 'COD certificate document URL when generated' })
  @IsString()
  @IsOptional()
  codDocumentUrl?: string;

  @ApiPropertyOptional({ description: 'Whether CVS certificate is generated' })
  @IsBoolean()
  @IsOptional()
  cvsGenerated?: boolean;

  @ApiPropertyOptional({ description: 'CVS certificate document URL when generated' })
  @IsString()
  @IsOptional()
  cvsDocumentUrl?: string;

  @ApiPropertyOptional({ description: 'RTO office name' })
  @IsString()
  @IsOptional()
  rtoOffice?: string;

  @ApiPropertyOptional({ enum: RtoStatus, default: RtoStatus.NOT_APPLIED })
  @IsEnum(RtoStatus)
  @IsOptional()
  rtoStatus?: RtoStatus;

  @ApiPropertyOptional({ description: 'Internal remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
