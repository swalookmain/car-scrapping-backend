import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';

export class QuerySalesInvoiceDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  buyerId?: string;

  @ApiPropertyOptional({ enum: SalesInvoiceStatus })
  @IsEnum(SalesInvoiceStatus)
  @IsOptional()
  status?: SalesInvoiceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoiceNumber?: string;
}
