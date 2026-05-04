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
