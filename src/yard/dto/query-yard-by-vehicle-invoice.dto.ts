import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class QueryYardByVehicleInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  vehicleInvoiceId?: string;
}
