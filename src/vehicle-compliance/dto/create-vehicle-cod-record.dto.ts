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
  @ApiProperty({ description: 'Vehicle invoice ID' })
  @IsMongoId()
  vehicleId: string;

  @ApiProperty({ description: 'Invoice ID linked to this vehicle' })
  @IsMongoId()
  invoiceId: string;

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

  @ApiPropertyOptional({ description: 'Stored COD document URL' })
  @IsString()
  @IsOptional()
  codDocumentUrl?: string;
}
