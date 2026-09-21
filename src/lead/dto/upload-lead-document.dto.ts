import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UploadLeadDocumentDto {
  @ApiPropertyOptional({ enum: ['single', 'double'], default: 'single' })
  @IsOptional()
  @IsIn(['single', 'double'])
  aadhaarPageMode?: 'single' | 'double';

  @ApiPropertyOptional({ enum: ['single', 'double'], default: 'single' })
  @IsOptional()
  @IsIn(['single', 'double'])
  rcPageMode?: 'single' | 'double';
}
