import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  IsIn,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { STAFF_ASSIGNABLE_MODULE_IDS } from 'src/common/access/app-modules';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Phone number', minLength: 10, maxLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  phoneNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(STAFF_ASSIGNABLE_MODULE_IDS, { each: true })
  allowedModules?: string[];
}
