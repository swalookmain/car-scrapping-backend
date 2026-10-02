import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';

export class QueryLeadsDto {
  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
