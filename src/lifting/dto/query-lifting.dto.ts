import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class QueryLiftingDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'completed', 'overdue'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'overdue'])
  tab?: 'pending' | 'completed' | 'overdue';

  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
