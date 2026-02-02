import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { InvoiceStatus } from 'src/common/enum/invoiceStatus.enum';
import { LeadSource } from 'src/common/enum/leadSource.enum';
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

  @ApiPropertyOptional({ description: 'Required for DIRECT seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.DIRECT)
  @IsDefined()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Required for DIRECT seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.DIRECT)
  @IsDefined()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Required for DIRECT seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.DIRECT)
  @IsDefined()
  @IsString()
  aadhaarNumber?: string;

  @ApiPropertyOptional({ description: 'Required for DIRECT seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.DIRECT)
  @IsDefined()
  @IsString()
  panNumber?: string;

  @ApiPropertyOptional({ enum: LeadSource, description: 'Required for DIRECT seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.DIRECT)
  @IsDefined()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({ description: 'Required for MSTC seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.MSTC)
  @IsDefined()
  @IsString()
  auctionNumber?: string;

  @ApiPropertyOptional({ description: 'Required for MSTC seller type (ISO 8601)' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.MSTC)
  @IsDefined()
  @IsDateString()
  auctionDate?: string;

  @ApiPropertyOptional({ description: 'Required for MSTC seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.MSTC)
  @IsDefined()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Required for MSTC seller type' })
  @ValidateIf((data: { sellerType?: SellerType }) => data.sellerType === SellerType.MSTC)
  @IsDefined()
  @IsString()
  lotNumber?: string;

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
