import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateBooksSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    example: '2024-04-01',
    description: 'Earliest business date this organization may enter. Null clears it.',
  })
  @IsOptional()
  @IsDateString()
  booksStartDate?: string | null;
}
