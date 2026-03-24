import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { GstAuditEventType } from 'src/common/enum/gstAuditEventType.enum';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';

export class QueryGstAuditLogDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Rows per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: GstAuditEventType })
  @IsOptional()
  @IsEnum(GstAuditEventType)
  eventType?: GstAuditEventType;

  @ApiPropertyOptional({ enum: InvoiceType })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({ description: 'Filter by invoice ID' })
  @IsOptional()
  @IsMongoId()
  invoiceId?: string;
}
