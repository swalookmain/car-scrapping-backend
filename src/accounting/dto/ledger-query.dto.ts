import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { LedgerReferenceType } from 'src/common/enum/ledgerReferenceType.enum';

export class LedgerQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: LedgerReferenceType })
  @IsOptional()
  @IsEnum(LedgerReferenceType)
  referenceType?: LedgerReferenceType;

  @ApiPropertyOptional({ description: 'Account ID' })
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Page (1-based)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limit per page' })
  @IsOptional()
  limit?: number;
}
