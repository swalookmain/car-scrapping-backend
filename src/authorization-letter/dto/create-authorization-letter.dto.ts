import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RecipientOverridesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientPinCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerReferenceNumber?: string;
}

export class CreateAuthorizationLetterDto {
  @ApiProperty()
  @IsMongoId()
  auctionId: string;

  @ApiProperty({ description: 'Name of person authorized to take delivery' })
  @IsString()
  @MinLength(2)
  authorizedPersonName: string;

  @ApiProperty({ description: 'Aadhaar / ID proof number of authorized person' })
  @IsString()
  @MinLength(4)
  authorizedPersonIdProof: string;

  @ApiPropertyOptional({
    description: 'Letter date (ISO). Defaults to today.',
  })
  @IsOptional()
  @IsString()
  letterDate?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Legacy extension-days field; ignored by delivery letter',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  extensionDays?: number;

  @ApiPropertyOptional({ type: RecipientOverridesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipientOverridesDto)
  recipientOverrides?: RecipientOverridesDto;
}
