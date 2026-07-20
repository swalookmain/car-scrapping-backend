import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class InventoryAuditQueryDto {
  @ApiPropertyOptional({ enum: ['fy', 'month', 'week', 'custom'] })
  @IsOptional()
  @IsIn(['fy', 'month', 'week', 'custom'])
  period?: 'fy' | 'month' | 'week' | 'custom';

  @ApiPropertyOptional({ description: 'ISO date (required for custom)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date (required for custom)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
