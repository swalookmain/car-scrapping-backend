import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator';

const toOptionalString = (value: unknown): string | undefined => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const emptyToUndefined = ({ value }: { value: unknown }): string | undefined =>
  toOptionalString(value);

const emptyToUndefinedDigits = ({ value }: { value: unknown }): string | undefined => {
  const raw = toOptionalString(value);
  return raw?.replace(/\D/g, '');
};

export class AuctionOfficerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefinedDigits)
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Officer phone number must be exactly 10 digits' })
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: ['MSTC', 'GEM', 'OTHERS', 'SELLER'] })
  @IsString()
  @IsIn(['MSTC', 'GEM', 'OTHERS', 'SELLER'])
  @IsOptional()
  officerType?: string;
}
