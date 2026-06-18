import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { SubscriptionType } from '../enum/subscription-type.enum';
import { SubscriptionPlan } from '../enum/subscription-plan.enum';

export class SubscriptionInputDto {
  @ApiProperty({ enum: SubscriptionType })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @ValidateIf((o: SubscriptionInputDto) => o.type === SubscriptionType.PAID)
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Optional end date override (ISO date)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
