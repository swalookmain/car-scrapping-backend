import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { GstAuditEventType } from 'src/common/enum/gstAuditEventType.enum';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'gst_audit_log',
})
export class GstAuditLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ enum: InvoiceType, required: true })
  invoiceType: InvoiceType;

  @Prop({ type: Types.ObjectId, required: true })
  invoiceId: Types.ObjectId;

  @Prop({ enum: GstAuditEventType, required: true })
  eventType: GstAuditEventType;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export type GstAuditLogDocument = GstAuditLog & Document;
export const GstAuditLogSchema = SchemaFactory.createForClass(GstAuditLog);
