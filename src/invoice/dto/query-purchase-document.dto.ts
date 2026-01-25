import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class QueryPurchaseDocumentDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;
}
