import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { FuelType } from '../../common/enum/fuelType.enum';
import { VechicleStatus } from '../../common/enum/vechicleStatus.enum';
import { VehicleType } from '../../common/enum/vehicleType.enum';

export class CreateVechileInvoiceDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty()
  @IsString()
  ownerName: string;

  // Vehicle Identity
  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicle_type: VehicleType;

  @ApiProperty()
  @IsString()
  make: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsString()
  variant: string;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuel_type: FuelType;

  // Identification
  @ApiProperty()
  @IsString()
  registration_number: string;

  @ApiProperty()
  @IsString()
  chassis_number: string;

  @ApiProperty()
  @IsString()
  engine_number: string;

  // Manufacturing & History
  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsNumber()
  year_of_manufacture: number;

  @ApiProperty({ description: 'Vehicle purchase date (ISO 8601)' })
  @IsDateString()
  vehicle_purchase_date: string;

  @ApiPropertyOptional({ enum: VechicleStatus, default: VechicleStatus.PURCHASED })
  @IsEnum(VechicleStatus)
  @IsOptional()
  vechicleStatus?: VechicleStatus;
}
