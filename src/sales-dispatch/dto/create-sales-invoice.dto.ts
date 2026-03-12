import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesInvoiceItemDto {
  @ApiProperty()
  @IsMongoId()
  partId: string;

  @ApiProperty()
  @IsString()
  itemCode: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateSalesInvoiceDto {
  @ApiProperty()
  @IsString()
  invoiceNumber: string;

  @ApiProperty()
  @IsMongoId()
  buyerId: string;

  @ApiProperty({ description: 'Invoice date (ISO 8601)' })
  @IsDateString()
  invoiceDate: string;

  @ApiProperty({ description: 'Place of supply state code' })
  @IsString()
  placeOfSupplyState: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  gstApplicable?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  gstRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  reverseChargeApplicable?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ewayBillNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ewayBillDocumentUrl?: string;

  @ApiProperty({ type: [CreateSalesInvoiceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesInvoiceItemDto)
  items: CreateSalesInvoiceItemDto[];
}
