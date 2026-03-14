import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChartOfAccountsRepository } from '../repositories/chart-of-accounts.repository';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_NAMES,
} from '../constants/default-accounts.constant';
import type { ChartOfAccountDocument } from '../schemas/chart-of-accounts.schema';

export type DefaultAccountMap = Record<keyof typeof DEFAULT_ACCOUNT_NAMES, string>;

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly chartOfAccountsRepository: ChartOfAccountsRepository) {}

  /**
   * Ensures default chart of accounts exists for the organization.
   * Idempotent: creates only missing accounts.
   * Returns a map of default account name -> account id for ledger posting.
   */
  async ensureDefaultAccounts(organizationId: string): Promise<DefaultAccountMap> {
    const orgId = new Types.ObjectId(organizationId);
    const existing = await this.chartOfAccountsRepository.findByOrganizationId(organizationId);
    const map: DefaultAccountMap = {} as DefaultAccountMap;

    for (const def of DEFAULT_ACCOUNTS) {
      let account = existing.find(
        (a: { accountName: string }) => a.accountName === def.accountName,
      ) as ChartOfAccountDocument | undefined;
      if (!account) {
        const created = await this.chartOfAccountsRepository.create({
          organizationId: orgId,
          accountName: def.accountName,
          accountType: def.accountType,
          systemGenerated: true,
        });
        account = created as ChartOfAccountDocument;
      }
      const key = Object.entries(DEFAULT_ACCOUNT_NAMES).find(
        ([, name]) => name === def.accountName,
      )?.[0] as keyof typeof DEFAULT_ACCOUNT_NAMES;
      if (key) map[key] = (account as { _id: Types.ObjectId })._id.toString();
    }

    return map;
  }

  async getAccountsByOrganization(organizationId: string) {
    return this.chartOfAccountsRepository.findByOrganizationId(organizationId);
  }

  async getAccountIdsByName(
    organizationId: string,
  ): Promise<DefaultAccountMap> {
    const accounts = await this.chartOfAccountsRepository.findByOrganizationId(organizationId);
    const map: DefaultAccountMap = {} as DefaultAccountMap;
    for (const key of Object.keys(DEFAULT_ACCOUNT_NAMES) as Array<keyof typeof DEFAULT_ACCOUNT_NAMES>) {
      const name = DEFAULT_ACCOUNT_NAMES[key];
      const acc = accounts.find((a: { accountName: string }) => a.accountName === name) as { _id: Types.ObjectId } | undefined;
      if (acc) map[key] = acc._id.toString();
    }
    return map;
  }
}
