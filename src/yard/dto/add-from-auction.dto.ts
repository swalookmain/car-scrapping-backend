import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddFromAuctionDto {
  @ApiProperty({ description: 'Auction lot ID (must be DEAL_DONE)' })
  @IsMongoId()
  lotId: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Auction vehicle IDs to park. Omit or empty to park all vehicles on the lot that are not already in yard.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  auctionVehicleIds?: string[];

  @ApiProperty({ description: 'Yard zone ID (required for park)' })
  @IsMongoId()
  zoneId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeightKg?: number;
}
