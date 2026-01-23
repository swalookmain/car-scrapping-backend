import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { VechicleStatus } from 'src/common/enum/vechicleStatus.enum';

export class CreateVechileInvoiceDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty()
  @IsString()
  ownerName: string;

  @ApiProperty()
  @IsString()
  vechileName: string;

  @ApiProperty()
  @IsString()
  vechileNumber: string;

  @ApiProperty()
  @IsString()
  registrationNumber: string;

  @ApiProperty()
  @IsString()
  rcNumber: string;

  @ApiPropertyOptional({ enum: VechicleStatus, default: VechicleStatus.PURCHASED })
  @IsEnum(VechicleStatus)
  @IsOptional()
  vechicleStatus?: VechicleStatus;
}
