import { AccountType } from 'src/common/enum/accountType.enum';

export const DEFAULT_ACCOUNTS: Array<{ accountName: string; accountType: AccountType }> = [
  { accountName: 'Cash', accountType: AccountType.ASSET },
  { accountName: 'Bank', accountType: AccountType.ASSET },
  { accountName: 'Accounts Receivable', accountType: AccountType.ASSET },
  { accountName: 'Accounts Payable', accountType: AccountType.LIABILITY },
  { accountName: 'GST Payable', accountType: AccountType.LIABILITY },
  { accountName: 'GST Input Credit', accountType: AccountType.ASSET },
  { accountName: 'RCM Liability', accountType: AccountType.LIABILITY },
  { accountName: 'Sales Revenue', accountType: AccountType.INCOME },
  { accountName: 'Purchase Expense', accountType: AccountType.EXPENSE },
  { accountName: 'Inventory Asset', accountType: AccountType.ASSET },
];

export const DEFAULT_ACCOUNT_NAMES = {
  CASH: 'Cash',
  BANK: 'Bank',
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  ACCOUNTS_PAYABLE: 'Accounts Payable',
  GST_PAYABLE: 'GST Payable',
  GST_INPUT_CREDIT: 'GST Input Credit',
  RCM_LIABILITY: 'RCM Liability',
  SALES_REVENUE: 'Sales Revenue',
  PURCHASE_EXPENSE: 'Purchase Expense',
  INVENTORY_ASSET: 'Inventory Asset',
} as const;
