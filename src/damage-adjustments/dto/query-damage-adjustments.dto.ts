import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class QueryDamageAdjustmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by inventory part ID' })
  @IsMongoId()
  @IsOptional()
  partId?: string;
}

