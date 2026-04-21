import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
// DTO (Data Transfer Object) for creating authentication credentials

export class CreateAuthDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
