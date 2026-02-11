import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Condition } from 'src/common/enum/condition.enum';
import { PartType } from 'src/common/enum/partType.enum';
import { Status } from 'src/common/enum/status.enum';

export class CreateInventoryItemDto {
  @ApiPropertyOptional({ description: 'Optional documents metadata for the part' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryDocumentDto)
  @IsOptional()
  documents?: InventoryDocumentDto[];

  @ApiProperty()
  @IsString()
  partName: string;

  @ApiProperty({ enum: PartType })
  @IsEnum(PartType)
  partType: PartType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  openingStock: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityReceived?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityIssued?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ enum: Condition })
  @IsEnum(Condition)
  condition: Condition;

  @ApiPropertyOptional({ enum: Status })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}

export class InventoryDocumentDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  storageKey: string;

  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  size: number;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  uploadedBy?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsDateString()
  @IsOptional()
  uploadedAt?: string;
}

export class CreateInventoryBatchDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty({ description: 'Vehicle Invoice ID' })
  @IsMongoId()
  vechileId: string;

  @ApiProperty({ type: [CreateInventoryItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryItemDto)
  parts: CreateInventoryItemDto[];
}
