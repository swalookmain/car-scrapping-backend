import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { CreateVechileInvoiceDto } from './create-vechile-invoice.dto';

export class CreateVechileInvoiceBatchItemDto extends OmitType(
  CreateVechileInvoiceDto,
  ['invoiceId'] as const,
) {}

export class CreateVechileInvoiceBatchDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty({ type: [CreateVechileInvoiceBatchItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVechileInvoiceBatchItemDto)
  vehicles: CreateVechileInvoiceBatchItemDto[];
}
