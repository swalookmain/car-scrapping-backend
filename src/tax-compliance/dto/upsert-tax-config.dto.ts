import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Min } from 'class-validator';

export class UpsertTaxConfigDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  defaultGstRate: number;

  @ApiProperty({ description: 'State code for GST place-of-supply checks' })
  @IsString()
  stateCode: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  gstEnabled: boolean;
}
