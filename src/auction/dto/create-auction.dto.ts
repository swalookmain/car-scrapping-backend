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

const toOptionalString = (value: unknown): string | undefined => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const emptyToUndefined = ({ value }: { value: unknown }): string | undefined =>
  toOptionalString(value);

const emptyToUndefinedDigits = ({ value }: { value: unknown }): string | undefined => {
  const raw = toOptionalString(value);
  return raw?.replace(/\D/g, '');
};

import { AuctionOfficerDto } from 'src/common/dto/auction-officer.dto';

export { AuctionOfficerDto };

export class CreateAuctionDto {
  @ApiPropertyOptional({ enum: ['MSTC', 'GEM', 'OTHERS'], default: 'MSTC' })
  @IsString()
  @IsIn(['MSTC', 'GEM', 'OTHERS'])
  @IsOptional()
  auctionerName?: string;

  @ApiProperty()
  @IsString()
  auctionNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  buyerReferenceNumber?: string;

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
  @Transform(emptyToUndefinedDigits)
  @Matches(/^\d{10}$/, { message: 'Seller mobile number must be exactly 10 digits' })
  sellerMobileNumber: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
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
