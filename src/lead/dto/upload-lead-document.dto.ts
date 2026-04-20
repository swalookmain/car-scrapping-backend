import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UploadLeadDocumentDto {
  @ApiProperty({ enum: ['single', 'double'] })
  @IsIn(['single', 'double'])
  pageMode: 'single' | 'double';
}
