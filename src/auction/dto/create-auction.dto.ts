import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  IsIn,
  ValidateNested,
} from 'class-validator';

export class AuctionOfficerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : String(value).replace(/\D/g, '')))
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Officer phone number must be exactly 10 digits' })
  phoneNumber?: string;
}

export class CreateAuctionDto {
  @ApiPropertyOptional({ enum: ['MSTC', 'GEM'], default: 'MSTC' })
  @IsString()
  @IsIn(['MSTC', 'GEM'])
  @IsOptional()
  auctionerName?: string;

  @ApiProperty()
  @IsString()
  auctionNumber: string;

  @ApiProperty()
  @IsDateString()
  auctionDate: string;

  @ApiProperty()
  @IsDateString()
  startDateTime: string;

  @ApiProperty()
  @IsDateString()
  endDateTime: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  inspectionFromDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  inspectionToDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  bidSubmissionDeadline?: string;

  @ApiPropertyOptional({ default: 'MSTC' })
  @IsString()
  @IsOptional()
  sourcePlatform?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sellerEntityName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sellerEntityCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auctionLocation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleLocation?: string;

  @ApiProperty()
  @IsString()
  sellerName: string;

  @ApiProperty()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : String(value).replace(/\D/g, ''),
  )
  @Matches(/^\d{10}$/, { message: 'Seller mobile number must be exactly 10 digits' })
  sellerMobileNumber: string;

  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsOptional()
  @IsEmail()
  sellerEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sellerAccountNumber?: string;

  @ApiPropertyOptional({ enum: ['FCM', 'RCM'] })
  @IsString()
  @IsIn(['FCM', 'RCM'])
  @IsOptional()
  sellerTaxMode?: 'FCM' | 'RCM';

  @ApiPropertyOptional({ deprecated: true })
  @IsString()
  @IsOptional()
  yardLocation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  emdAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emdReference?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  emdPaidOn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ type: [AuctionOfficerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuctionOfficerDto)
  @IsOptional()
  officers?: AuctionOfficerDto[];
}
