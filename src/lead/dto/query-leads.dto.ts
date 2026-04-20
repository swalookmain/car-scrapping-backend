import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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
}
