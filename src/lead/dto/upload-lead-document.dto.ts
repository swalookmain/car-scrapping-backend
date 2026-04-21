import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UploadLeadDocumentDto {
  @ApiProperty({ enum: ['single', 'double'], default: 'single' })
  @IsIn(['single', 'double'])
  aadhaarPageMode: 'single' | 'double';

  @ApiProperty({ enum: ['single', 'double'], default: 'single' })
  @IsIn(['single', 'double'])
  rcPageMode: 'single' | 'double';
}
