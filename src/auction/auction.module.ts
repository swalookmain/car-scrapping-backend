import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction, AuctionSchema } from './auction.schema';
import { AuctionLot, AuctionLotSchema } from './auction-lot.schema';
import { AuctionVehicle, AuctionVehicleSchema } from './auction-vehicle.schema';
import {
  AuctionVehicleDocumentRecord,
  AuctionVehicleDocumentRecordSchema,
} from './auction-vehicle-document.schema';
import { AuctionRepository } from './auction.repository';
import { AuctionLotRepository } from './auction-lot.repository';
import { AuctionVehicleRepository } from './auction-vehicle.repository';
import { AuctionCounter, AuctionCounterSchema } from './auction-counter.schema';
import { AuctionCounterRepository } from './auction-counter.repository';
import { Invoice, InvoiceSchema } from 'src/invoice/invoice.schema';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { AuctionVehicleDocumentRepository } from './auction-vehicle-document.repository';
import { NotificationModule } from 'src/notification/notification.module';
import { LifecycleController } from './lifecycle/lifecycle.controller';
import { LifecycleService } from './lifecycle/lifecycle.service';
import { LifecycleStateService } from './lifecycle/lifecycle-state.service';
import { LotPaymentRecord, LotPaymentRecordSchema } from './lifecycle/schemas/lot-payment-record.schema';
import { LotLifecycleEvent, LotLifecycleEventSchema } from './lifecycle/schemas/lot-lifecycle-event.schema';
import { LotDocument, LotDocumentSchema } from './lifecycle/schemas/lot-document.schema';
import { LotPaymentRecordRepository } from './lifecycle/repositories/lot-payment-record.repository';
import { LotLifecycleEventRepository } from './lifecycle/repositories/lot-lifecycle-event.repository';
import { LotDocumentRepository } from './lifecycle/repositories/lot-document.repository';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: Auction.name, schema: AuctionSchema },
      { name: AuctionLot.name, schema: AuctionLotSchema },
      { name: AuctionVehicle.name, schema: AuctionVehicleSchema },
      {
        name: AuctionVehicleDocumentRecord.name,
        schema: AuctionVehicleDocumentRecordSchema,
      },
      { name: AuctionCounter.name, schema: AuctionCounterSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: LotPaymentRecord.name, schema: LotPaymentRecordSchema },
      { name: LotLifecycleEvent.name, schema: LotLifecycleEventSchema },
      { name: LotDocument.name, schema: LotDocumentSchema },
    ]),
  ],
  controllers: [AuctionController, LifecycleController],
  providers: [
    AuctionService,
    LifecycleService,
    LifecycleStateService,
    AuctionRepository,
    AuctionLotRepository,
    AuctionVehicleRepository,
    AuctionCounterRepository,
    InvoiceRepository,
    AuctionVehicleDocumentRepository,
    LotPaymentRecordRepository,
    LotLifecycleEventRepository,
    LotDocumentRepository,
  ],
  exports: [
    AuctionService,
    AuctionRepository,
    AuctionLotRepository,
    AuctionVehicleRepository,
    AuctionVehicleDocumentRepository,
  ],
})
export class AuctionModule {}
