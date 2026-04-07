import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty()
  @IsMongoId()
  staffId: string;
}
