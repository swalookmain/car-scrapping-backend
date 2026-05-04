import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuctionVehicleStatus } from 'src/common/enum/auctionVehicleStatus.enum';

export class CreateAuctionVehicleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  make?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variant?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{0,5}$/)
  @MaxLength(5)
  @IsOptional()
  chassisLast5?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  yearOfManufacture?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleCondition?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  rcAvailable?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  keyAvailable?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pickupDate?: string;

  @ApiPropertyOptional({ enum: AuctionVehicleStatus })
  @IsEnum(AuctionVehicleStatus)
  @IsOptional()
  status?: AuctionVehicleStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateAuctionVehicleBatchDto {
  @ApiPropertyOptional({ type: [CreateAuctionVehicleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAuctionVehicleDto)
  vehicles: CreateAuctionVehicleDto[];
}
