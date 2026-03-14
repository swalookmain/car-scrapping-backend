import { Module } from '@nestjs/common';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { SalesDispatchModule } from 'src/sales-dispatch/sales-dispatch.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InvoiceModule, SalesDispatchModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
