import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { LedgerReferenceType } from 'src/common/enum/ledgerReferenceType.enum';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { LedgerEntryRepository } from '../repositories/ledger-entry.repository';

/** Purchase invoice (from invoice collection): tax and payable amounts */
export interface PurchaseInvoiceForLedger {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  taxableAmount: number;
  totalTaxAmount: number;
  reverseChargeApplicable: boolean;
}

/** Sales invoice: total, taxable, tax */
export interface SalesInvoiceForLedger {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  totalAmount: number;
  taxableAmount: number;
  totalTaxAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class LedgerService {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly ledgerEntryRepository: LedgerEntryRepository,
  ) {}

  /**
   * Posts a confirmed purchase invoice to the ledger (double-entry).
   * Idempotent: skips if entries already exist for this reference.
   */
  async postPurchaseInvoice(
    organizationId: string,
    invoice: PurchaseInvoiceForLedger,
  ): Promise<void> {
    const refId = invoice._id.toString();
    const exists = await this.ledgerEntryRepository.hasEntriesForReference(
      organizationId,
      LedgerReferenceType.PURCHASE_INVOICE,
      refId,
    );
    if (exists) return;

    const accountIds = await this.chartOfAccountsService.ensureDefaultAccounts(organizationId);
    const orgId = new Types.ObjectId(organizationId);
    const taxable = round2(invoice.taxableAmount);
    const tax = round2(invoice.totalTaxAmount);
    const entries: Array<{
      organizationId: Types.ObjectId;
      accountId: Types.ObjectId;
      debitAmount: number;
      creditAmount: number;
      referenceType: LedgerReferenceType;
      referenceId: Types.ObjectId;
    }> = [];

    if (invoice.reverseChargeApplicable) {
      const payableToSupplier = taxable;
      const rcmLiability = tax;
      const purchaseExpenseTotal = round2(taxable + tax);
      entries.push(
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.PURCHASE_EXPENSE),
          debitAmount: purchaseExpenseTotal,
          creditAmount: 0,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.ACCOUNTS_PAYABLE),
          debitAmount: 0,
          creditAmount: payableToSupplier,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.RCM_LIABILITY),
          debitAmount: 0,
          creditAmount: rcmLiability,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
      );
    } else {
      const totalPayable = round2(taxable + tax);
      entries.push(
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.PURCHASE_EXPENSE),
          debitAmount: taxable,
          creditAmount: 0,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.GST_INPUT_CREDIT),
          debitAmount: tax,
          creditAmount: 0,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
        {
          organizationId: orgId,
          accountId: new Types.ObjectId(accountIds.ACCOUNTS_PAYABLE),
          debitAmount: 0,
          creditAmount: totalPayable,
          referenceType: LedgerReferenceType.PURCHASE_INVOICE,
          referenceId: invoice._id,
        },
      );
    }

    await this.ledgerEntryRepository.createMany(entries);
  }

  /**
   * Posts a confirmed sales invoice to the ledger (double-entry).
   * Idempotent: skips if entries already exist for this reference.
   */
  async postSalesInvoice(
    organizationId: string,
    invoice: SalesInvoiceForLedger,
  ): Promise<void> {
    const refId = invoice._id.toString();
    const exists = await this.ledgerEntryRepository.hasEntriesForReference(
      organizationId,
      LedgerReferenceType.SALES_INVOICE,
      refId,
    );
    if (exists) return;

    const accountIds = await this.chartOfAccountsService.ensureDefaultAccounts(organizationId);
    const orgId = new Types.ObjectId(organizationId);
    const total = round2(invoice.totalAmount);
    const taxable = round2(invoice.taxableAmount);
    const tax = round2(invoice.totalTaxAmount);

    const entries = [
      {
        organizationId: orgId,
        accountId: new Types.ObjectId(accountIds.ACCOUNTS_RECEIVABLE),
        debitAmount: total,
        creditAmount: 0,
        referenceType: LedgerReferenceType.SALES_INVOICE,
        referenceId: invoice._id,
      },
      {
        organizationId: orgId,
        accountId: new Types.ObjectId(accountIds.SALES_REVENUE),
        debitAmount: 0,
        creditAmount: taxable,
        referenceType: LedgerReferenceType.SALES_INVOICE,
        referenceId: invoice._id,
      },
      {
        organizationId: orgId,
        accountId: new Types.ObjectId(accountIds.GST_PAYABLE),
        debitAmount: 0,
        creditAmount: tax,
        referenceType: LedgerReferenceType.SALES_INVOICE,
        referenceId: invoice._id,
      },
    ];

    await this.ledgerEntryRepository.createMany(entries);
  }
}
