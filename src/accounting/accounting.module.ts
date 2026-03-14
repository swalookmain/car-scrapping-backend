import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChartOfAccount,
  ChartOfAccountSchema,
} from './schemas/chart-of-accounts.schema';
import {
  LedgerEntry,
  LedgerEntrySchema,
} from './schemas/ledger-entry.schema';
import {
  InvoicePaymentRecord,
  InvoicePaymentRecordSchema,
} from './schemas/invoice-payment-record.schema';
import { ChartOfAccountsRepository } from './repositories/chart-of-accounts.repository';
import { LedgerEntryRepository } from './repositories/ledger-entry.repository';
import { InvoicePaymentRecordRepository } from './repositories/invoice-payment-record.repository';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { LedgerService } from './services/ledger.service';
import { AccountingController } from './accounting.controller';
import { PnlService } from './services/pnl.service';
import { InvoicePaymentService } from './services/invoice-payment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccount.name, schema: ChartOfAccountSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: InvoicePaymentRecord.name, schema: InvoicePaymentRecordSchema },
    ]),
  ],
  controllers: [AccountingController],
  providers: [
    ChartOfAccountsRepository,
    LedgerEntryRepository,
    InvoicePaymentRecordRepository,
    ChartOfAccountsService,
    LedgerService,
    PnlService,
    InvoicePaymentService,
  ],
  exports: [LedgerService, ChartOfAccountsService],
})
export class AccountingModule {}
