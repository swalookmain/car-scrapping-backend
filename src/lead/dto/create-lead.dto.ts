import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { FuelType } from 'src/common/enum/fuelType.enum';
import { LeadSource } from 'src/common/enum/leadSource.enum';
import { VehicleType } from 'src/common/enum/vehicleType.enum';

const EmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  mobileNumber: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Vehicle name for invoice lookup' })
  @IsString()
  vehicleName: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @EmptyToUndefined()
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiProperty({ description: 'Wheel variant such as two wheeler, four wheeler' })
  @IsString()
  variant: string;

  @ApiPropertyOptional({ enum: FuelType })
  @EmptyToUndefined()
  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Only last 5 digits of chassis number' })
  @EmptyToUndefined()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{5}$/)
  @IsOptional()
  last5ChassisNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  engineNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsNumber()
  @IsOptional()
  yearOfManufacture?: number;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  rtoDistrictBranch?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isOwnerSelf?: boolean;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  aadhaarNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  panNumber?: string;

  @ApiPropertyOptional({ enum: LeadSource })
  @EmptyToUndefined()
  @IsEnum(LeadSource)
  @IsOptional()
  leadSource?: LeadSource;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  placeOfSupplyState?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsNumber()
  @IsOptional()
  purchaseAmount?: number;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  reverseChargeApplicable?: boolean;

  @ApiPropertyOptional({ description: 'Admin can assign during create' })
  @EmptyToUndefined()
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Optional important remarks or comments' })
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  remarks?: string;
}
