import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
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

  @ApiProperty({ default: 3 })
  @IsInt()
  @Min(1)
  extensionDays: number;

  @ApiPropertyOptional({ type: RecipientOverridesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipientOverridesDto)
  recipientOverrides?: RecipientOverridesDto;
}
