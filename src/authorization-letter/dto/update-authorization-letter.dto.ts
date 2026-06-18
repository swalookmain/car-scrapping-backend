import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  extensionDays?: number;
}
