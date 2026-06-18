import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { SubscriptionType } from '../enum/subscription-type.enum';
import { SubscriptionPlan } from '../enum/subscription-plan.enum';
import { SubscriptionStatus } from '../enum/subscription-status.enum';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionType })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @ValidateIf((o: UpdateSubscriptionDto) => o.type === SubscriptionType.PAID)
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
