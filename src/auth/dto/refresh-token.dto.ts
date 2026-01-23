import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  //all meta data should be stored in the database and should be retrieved from the database
  @ApiProperty({ description: 'Meta data' })
  @IsString()
  @IsNotEmpty()
  metaData: {
    ip: string;
    userAgent: string;
    device: string;
    browser: string;
    os: string;
    country: string;
  };
}
