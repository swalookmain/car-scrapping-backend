import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';

export class GstSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: InvoiceType, description: 'Filter by invoice type' })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;
}
