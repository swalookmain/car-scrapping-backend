import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuctionVehicleImageType =
  | 'vehicleFront'
  | 'vehicleRight'
  | 'vehicleEngine'
  | 'vehicleLeft'
  | 'vehicleBack'
  | 'vehicleInterior';

@Schema({ timestamps: true })
export class AuctionVehicleDocumentRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'AuctionVehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuctionLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'vehicleFront',
      'vehicleRight',
      'vehicleEngine',
      'vehicleLeft',
      'vehicleBack',
      'vehicleInterior',
    ],
  })
  documentType: AuctionVehicleImageType;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  storageKey: string;

  @Prop({ required: true, enum: ['cloudinary', 's3'] })
  provider: 'cloudinary' | 's3';
}

export type AuctionVehicleDocumentRecordDocument = AuctionVehicleDocumentRecord & Document;
export const AuctionVehicleDocumentRecordSchema = SchemaFactory.createForClass(
  AuctionVehicleDocumentRecord,
);

AuctionVehicleDocumentRecordSchema.index(
  { vehicleId: 1, documentType: 1 },
  { unique: true },
);
