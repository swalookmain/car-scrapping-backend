import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LeadLookupQueryDto {
  @ApiPropertyOptional({ description: 'Search by lead name or vehicle name' })
  @IsString()
  @IsOptional()
  q?: string;
}
