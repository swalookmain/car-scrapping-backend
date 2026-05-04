import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuctionLotStatus } from 'src/common/enum/auctionLotStatus.enum';

export class CreateAuctionLotDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lotName?: string;

  @ApiProperty()
  @IsString()
  lotNumber: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  preEmdAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lotDescription?: string;

  @ApiProperty()
  @IsNumber()
  vehicleCount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  expectedVehicleCount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  bidAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  awardedAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workOrderNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  loaNumber?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  loaDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  pickupWindowStart?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  pickupWindowEnd?: string;

  @ApiPropertyOptional({ enum: AuctionLotStatus })
  @IsEnum(AuctionLotStatus)
  @IsOptional()
  status?: AuctionLotStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
