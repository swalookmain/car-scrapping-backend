import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { SellerType } from 'src/common/enum/sellerType.enum';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  sellerName: string;

  @ApiProperty({ enum: SellerType })
  @IsEnum(SellerType)
  sellerType: SellerType;

  @ApiPropertyOptional({ description: 'Invoice number (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Seller GSTIN' })
  @IsString()
  @IsOptional()
  sellerGstin?: string;

  @ApiProperty()
  @IsNumber()
  purchaseAmount: number;

  @ApiProperty({ description: 'Purchase date (ISO 8601)' })
  @IsDateString()
  purchaseDate: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  gstApplicable?: boolean;

  @ApiPropertyOptional({ description: 'GST rate (required if gstApplicable is true)' })
  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gstAmount?: number;

  @ApiProperty()
  @IsBoolean()
  reverseChargeApplicable: boolean;

  @ApiPropertyOptional({ enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
