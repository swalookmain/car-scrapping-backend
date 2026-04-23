import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  Max,
  Min,
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
const VEHICLE_NUMBER_REGEX =
  /^(?:[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{4}|[0-9]{2}[- ]?BH[- ]?[0-9]{4}[- ]?[A-Z]{2})$/;

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Vehicle name for invoice lookup' })
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  vehicleName?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @EmptyToUndefined()
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Vehicle model/variant' })
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  variant?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @EmptyToUndefined()
  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @Matches(VEHICLE_NUMBER_REGEX, {
    message: 'Registration number must be a valid Indian vehicle format',
  })
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ enum: ['WORKING', 'NOT_WORKING'] })
  @EmptyToUndefined()
  @IsIn(['WORKING', 'NOT_WORKING'])
  @IsOptional()
  vehicleWorkingCondition?: 'WORKING' | 'NOT_WORKING';

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
  @Min(1900)
  @Max(2100)
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

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isInterested?: boolean;

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
  @Matches(/^\d{10}$/, {
    message: 'Aadhaar linked mobile number must be exactly 10 digits',
  })
  @IsOptional()
  aadhaarLinkedMobileNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  panNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  bankIfscCode?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  bankBranchName?: string;

  @ApiPropertyOptional()
  @EmptyToUndefined()
  @IsString()
  @IsOptional()
  bankName?: string;

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
