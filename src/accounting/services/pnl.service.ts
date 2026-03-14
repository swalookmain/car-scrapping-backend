import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountType } from 'src/common/enum/accountType.enum';
import { ChartOfAccountsRepository } from '../repositories/chart-of-accounts.repository';
import { LedgerEntryRepository } from '../repositories/ledger-entry.repository';

export interface PnlSummary {
  income: number;
  expense: number;
  profitOrLoss: number;
  byAccountType: {
    INCOME: number;
    EXPENSE: number;
    ASSET: number;
    LIABILITY: number;
  };
}

@Injectable()
export class PnlService {
  constructor(
    private readonly chartOfAccountsRepository: ChartOfAccountsRepository,
    private readonly ledgerEntryRepository: LedgerEntryRepository,
  ) {}

  /**
   * Basic P&L: sum of (credits - debits) by account type.
   * INCOME: credit balance = revenue. EXPENSE: debit balance = expense.
   */
  async getPnlSummary(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<PnlSummary> {
    const accounts = await this.chartOfAccountsRepository.findByOrganizationId(
      organizationId,
    );
    const accountIdsByType: Record<AccountType, string[]> = {
      [AccountType.ASSET]: [],
      [AccountType.LIABILITY]: [],
      [AccountType.INCOME]: [],
      [AccountType.EXPENSE]: [],
    };
    for (const a of accounts as Array<{ _id: Types.ObjectId; accountType: AccountType }>) {
      accountIdsByType[a.accountType].push(a._id.toString());
    }

    const entries = await this.ledgerEntryRepository.findByOrganization(
      organizationId,
      { fromDate, toDate },
    );

    const byAccountId: Record<string, { debit: number; credit: number }> = {};
    for (const e of entries as Array<{
      accountId: Types.ObjectId;
      debitAmount: number;
      creditAmount: number;
    }>) {
      const id = e.accountId.toString();
      if (!byAccountId[id]) byAccountId[id] = { debit: 0, credit: 0 };
      byAccountId[id].debit += e.debitAmount ?? 0;
      byAccountId[id].credit += e.creditAmount ?? 0;
    }

    let income = 0;
    let expense = 0;
    const byType = {
      INCOME: 0,
      EXPENSE: 0,
      ASSET: 0,
      LIABILITY: 0,
    };

    for (const type of Object.keys(accountIdsByType) as AccountType[]) {
      for (const id of accountIdsByType[type]) {
        const bal = byAccountId[id];
        if (!bal) continue;
        const balance = bal.credit - bal.debit;
        byType[type] += balance;
        if (type === AccountType.INCOME) income += balance;
        if (type === AccountType.EXPENSE) expense += bal.debit - bal.credit;
      }
    }

    return {
      income,
      expense,
      profitOrLoss: income - expense,
      byAccountType: byType,
    };
  }
}
