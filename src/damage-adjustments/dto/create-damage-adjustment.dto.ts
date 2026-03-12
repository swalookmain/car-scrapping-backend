import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNumber, IsString, Min } from 'class-validator';
import { Condition } from 'src/common/enum/condition.enum';

export class CreateDamageAdjustmentDto {
  @ApiProperty({ description: 'Inventory part ID' })
  @IsMongoId()
  partId: string;

  @ApiProperty({ enum: Condition, description: 'New condition after adjustment' })
  @IsEnum(Condition)
  newCondition: Condition;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  quantityAffected: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

