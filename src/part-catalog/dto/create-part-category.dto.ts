import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePartCategoryDto {
  @ApiProperty({ description: 'Category name (saved as lowercase slug)' })
  @IsString()
  @MinLength(1)
  name: string;
}
