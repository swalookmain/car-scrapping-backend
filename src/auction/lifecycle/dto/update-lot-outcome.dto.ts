import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';

export class LotOutcomeItemDto {
  @ApiProperty()
  @IsString()
  lotId: string;

  @ApiProperty({ enum: LotOutcomeStatus })
  @IsEnum(LotOutcomeStatus)
  outcomeStatus: LotOutcomeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  preEmdAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dealClosedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;
}

export class UpdateLotOutcomeBatchDto {
  @ApiProperty({ type: [LotOutcomeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LotOutcomeItemDto)
  lots: LotOutcomeItemDto[];
}
