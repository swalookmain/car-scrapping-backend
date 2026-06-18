import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  confirmPassword: string;

  @ApiProperty({ description: 'Organization / business name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  organizationName: string;
}
