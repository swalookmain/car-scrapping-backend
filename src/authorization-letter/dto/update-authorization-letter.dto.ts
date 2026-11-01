import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateAuthorizationLetterDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  authorizedPersonName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  authorizedPersonIdProof?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  letterDate?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  extensionDays?: number;
}
