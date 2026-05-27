import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';

export class QueryYardVehicleDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: YardVehicleStatus })
  @IsOptional()
  @IsEnum(YardVehicleStatus)
  status?: YardVehicleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  zoneId?: string;
}
