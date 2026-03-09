import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { BuyerType } from 'src/common/enum/buyerType.enum';

export class CreateBuyerDto {
  @ApiProperty()
  @IsString()
  buyerName: string;

  @ApiProperty({ enum: BuyerType })
  @IsEnum(BuyerType)
  buyerType: BuyerType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty()
  @IsString()
  mobile: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  address: string;
}
