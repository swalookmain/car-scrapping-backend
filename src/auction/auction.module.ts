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
import { StorageService } from 'src/common/services/storage.service';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [AuctionController],
  providers: [
    AuctionService,
    AuctionRepository,
    AuctionLotRepository,
    AuctionVehicleRepository,
    AuctionCounterRepository,
    InvoiceRepository,
    AuctionVehicleDocumentRepository,
    StorageService,
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
