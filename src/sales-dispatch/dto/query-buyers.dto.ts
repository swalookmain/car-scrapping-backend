import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { BuyerType } from 'src/common/enum/buyerType.enum';

export class QueryBuyersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BuyerType })
  @IsEnum(BuyerType)
  @IsOptional()
  buyerType?: BuyerType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  buyerName?: string;
}
