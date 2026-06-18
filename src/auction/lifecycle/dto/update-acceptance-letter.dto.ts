import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAcceptanceLetterDto {
  @ApiProperty()
  @IsBoolean()
  received: boolean;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.received === true)
  @IsString()
  letterNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.received === true)
  @IsDateString()
  receivedDate?: string;
}
