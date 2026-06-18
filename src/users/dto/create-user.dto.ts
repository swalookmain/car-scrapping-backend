import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from 'src/common/enum/role.enum';
import { SubscriptionInputDto } from 'src/subscription/dto/subscription-input.dto';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Organization ID (required unless organizationName is provided)',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Organization name when creating a new client',
  })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional({ type: SubscriptionInputDto })
  @ValidateNested()
  @Type(() => SubscriptionInputDto)
  @IsOptional()
  subscription?: SubscriptionInputDto;
}
