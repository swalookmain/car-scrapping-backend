import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction } from 'src/common/enum/audit.enum';
import { Role } from 'src/common/enum/role.enum';

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'false' } })
export class AuditLog extends Document {
  @Prop({ type: Types.ObjectId, required: false, default: null })
  actorId: Types.ObjectId | null;

  @Prop({ enum: Role, required: true })
  actorRole: Role;

  @Prop({ type: Types.ObjectId, required: false, default: null })
  organizationId: Types.ObjectId | null;

  @Prop({ enum: AuditAction, required: true })
  action: AuditAction;

  @Prop({ required: true })
  resource: string;

  @Prop({ type: Types.ObjectId })
  resourceId: Types.ObjectId;

  @Prop({ enum: ['SUCCESS', 'FAILURE'], required: true })
  status: 'SUCCESS' | 'FAILURE';

  @Prop()
  errorMessage?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop()
  device?: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  // TTL
  @Prop({ required: true })
  expireAt: Date;

  createdAt?: Date;
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
