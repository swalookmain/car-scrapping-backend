import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLotPaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amountPaid: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
