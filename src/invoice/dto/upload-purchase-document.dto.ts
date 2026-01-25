import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class UploadPurchaseDocumentDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;

  @ApiPropertyOptional({ description: 'Vechile invoice ID' })
  @IsOptional()
  @IsMongoId()
  vechileInvoiceId?: string;
}
