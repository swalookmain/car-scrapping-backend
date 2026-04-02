import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Phone number', minLength: 10, maxLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  phoneNumber?: string;
}
