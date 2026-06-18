import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AuctionOfficerDto } from 'src/common/dto/auction-officer.dto';

export class UpdateLotDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryOrderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastLiftingDate?: string;

  @ApiPropertyOptional({ type: [AuctionOfficerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuctionOfficerDto)
  officers?: AuctionOfficerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  finalApprovalForLifting?: boolean;
}
