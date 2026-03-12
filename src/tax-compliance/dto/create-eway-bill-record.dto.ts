import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsMongoId, IsString } from 'class-validator';
import { TransportMode } from 'src/common/enum/transportMode.enum';

export class CreateEwayBillRecordDto {
  @ApiProperty()
  @IsMongoId()
  salesInvoiceId: string;

  @ApiProperty()
  @IsString()
  ewayBillNumber: string;

  @ApiProperty({ description: 'E-way generated date (ISO 8601)' })
  @IsDateString()
  ewayGeneratedDate: string;

  @ApiProperty({ enum: TransportMode })
  @IsEnum(TransportMode)
  transportMode: TransportMode;

  @ApiProperty()
  @IsString()
  vehicleNumber: string;

  @ApiProperty()
  @IsString()
  documentUrl: string;
}
