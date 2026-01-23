import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsIn,
  IsObject,
} from 'class-validator';
import { Types } from 'mongoose';
import { AuditAction } from 'src/common/enum/audit.enum';
import { Role } from 'src/common/enum/role.enum';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'ID of the user performing the action' })
  @IsOptional()
  @IsMongoId()
  actorId?: Types.ObjectId;

  @ApiProperty({
    enum: Role,
    description: 'Role of the user performing the action',
  })
  @IsEnum(Role)
  actorRole: Role;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsMongoId()
  organizationId?: Types.ObjectId;

  @ApiProperty({ enum: AuditAction, description: 'Action performed' })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ description: 'Resource type (e.g., "user", "organization")' })
  @IsString()
  resource: string;

  @ApiPropertyOptional({ description: 'ID of the resource affected' })
  @IsOptional()
  @IsMongoId()
  resourceId?: Types.ObjectId;

  @ApiProperty({
    enum: ['SUCCESS', 'FAILURE'],
    description: 'Status of the action',
  })
  @IsIn(['SUCCESS', 'FAILURE'])
  status: 'SUCCESS' | 'FAILURE';

  @ApiPropertyOptional({ description: 'Error message if action failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({
    description: 'Request payload snapshot (sanitized)',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
