import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';

export class QueryVehicleCodRecordDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by invoice ID' })
  @IsMongoId()
  @IsOptional()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Filter by vehicle ID' })
  @IsMongoId()
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by COD generated status',
    enum: ['true', 'false'],
  })
  @IsBooleanString()
  @IsOptional()
  codGenerated?: string;

  @ApiPropertyOptional({ enum: RtoStatus, description: 'Filter by RTO status' })
  @IsEnum(RtoStatus)
  @IsOptional()
  rtoStatus?: RtoStatus;
}
