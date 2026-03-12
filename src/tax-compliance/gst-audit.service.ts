import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { GstAuditEventType } from 'src/common/enum/gstAuditEventType.enum';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { GstAuditLogRepository } from './gst-audit-log.repository';

@Injectable()
export class GstAuditService {
  constructor(private readonly gstAuditLogRepository: GstAuditLogRepository) {}

  async logEvent(input: {
    organizationId: string;
    invoiceType: InvoiceType;
    invoiceId: string;
    eventType: GstAuditEventType;
    metadata?: Record<string, unknown>;
  }) {
    return this.gstAuditLogRepository.create({
      organizationId: new Types.ObjectId(input.organizationId),
      invoiceType: input.invoiceType,
      invoiceId: new Types.ObjectId(input.invoiceId),
      eventType: input.eventType,
      metadata: input.metadata ?? {},
    });
  }
}
