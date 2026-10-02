import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2024-04-01', description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31', description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
