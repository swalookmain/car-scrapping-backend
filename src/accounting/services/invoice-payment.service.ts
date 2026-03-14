import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { sanitizeObject, validateObjectId } from 'src/common/utils/security.util';
import { InvoicePaymentRecordRepository } from '../repositories/invoice-payment-record.repository';
import type { CreateInvoicePaymentRecordDto } from '../dto/create-invoice-payment-record.dto';

@Injectable()
export class InvoicePaymentService {
  constructor(
    private readonly invoicePaymentRecordRepository: InvoicePaymentRecordRepository,
  ) {}

  async recordPayment(
    dto: CreateInvoicePaymentRecordDto,
    user: AuthenticatedUser,
  ) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('Organization not found');
    const sanitized = sanitizeObject(dto) as CreateInvoicePaymentRecordDto;
    const invoiceId = validateObjectId(sanitized.invoiceId, 'Invoice ID');
    return this.invoicePaymentRecordRepository.create({
      organizationId: new Types.ObjectId(orgId),
      invoiceType: sanitized.invoiceType,
      invoiceId: new Types.ObjectId(invoiceId),
      paymentAmount: sanitized.paymentAmount,
      paymentDate: new Date(sanitized.paymentDate),
      paymentMode: sanitized.paymentMode,
    });
  }

  async getPaymentsByInvoice(
    organizationId: string,
    invoiceType: string,
    invoiceId: string,
  ) {
    const id = validateObjectId(invoiceId, 'Invoice ID');
    return this.invoicePaymentRecordRepository.findByOrganizationAndInvoice(
      organizationId,
      invoiceType,
      invoiceId,
    );
  }
}
