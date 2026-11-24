import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
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

/** Batch row: optional `id` of an existing auction vehicle so it is updated in place. */
export class CreateAuctionVehicleBatchItemDto extends CreateAuctionVehicleDto {
  @ApiPropertyOptional({ description: 'Existing auction vehicle id (update in place)' })
  @IsMongoId()
  @IsOptional()
  id?: string;
}

export class CreateAuctionVehicleBatchDto {
  @ApiPropertyOptional({ type: [CreateAuctionVehicleBatchItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAuctionVehicleBatchItemDto)
  vehicles: CreateAuctionVehicleBatchItemDto[];
}
