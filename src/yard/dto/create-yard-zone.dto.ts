import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateYardZoneDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code: string;
}
