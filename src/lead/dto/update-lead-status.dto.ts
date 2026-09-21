import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codInwardNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  liftingStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedArrivalAt?: string;
}
