import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import {
  SalesInvoiceRepository,
  GstTotalsResult,
} from 'src/sales-dispatch/sales-invoice.repository';
import type { GstSummaryQueryDto } from './dto/gst-summary-query.dto';

export interface GstSummaryResponse {
  totalTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  rcmAmount: number;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly salesInvoiceRepository: SalesInvoiceRepository,
  ) {}

  async getGstSummary(
    query: GstSummaryQueryDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<GstSummaryResponse> {
    const orgId = this.getOrgId(authenticatedUser);
    const { fromDate, toDate, invoiceType } = query;

    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    if (from > to) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    if (invoiceType === InvoiceType.PURCHASE) {
      return this.invoiceRepository.getGstTotalsForPeriod(orgId, from, to);
    }
    if (invoiceType === InvoiceType.SALES) {
      return this.salesInvoiceRepository.getGstTotalsForPeriod(orgId, from, to);
    }

    const [purchaseTotals, salesTotals] = await Promise.all([
      this.invoiceRepository.getGstTotalsForPeriod(orgId, from, to),
      this.salesInvoiceRepository.getGstTotalsForPeriod(orgId, from, to),
    ]);

    return {
      totalTaxable: (purchaseTotals?.totalTaxable ?? 0) + (salesTotals?.totalTaxable ?? 0),
      cgst: (purchaseTotals?.cgst ?? 0) + (salesTotals?.cgst ?? 0),
      sgst: (purchaseTotals?.sgst ?? 0) + (salesTotals?.sgst ?? 0),
      igst: (purchaseTotals?.igst ?? 0) + (salesTotals?.igst ?? 0),
      rcmAmount: (purchaseTotals?.rcmAmount ?? 0) + (salesTotals?.rcmAmount ?? 0),
    };
  }

  private getOrgId(authenticatedUser: AuthenticatedUser): string {
    if (!authenticatedUser.orgId) {
      throw new BadRequestException('Organization not found');
    }
    return authenticatedUser.orgId;
  }

  private getDefaultFromDate(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }
}
