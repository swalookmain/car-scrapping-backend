import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FuelType } from '../common/enum/fuelType.enum';
import { VechicleStatus } from '../common/enum/vechicleStatus.enum';
import { VehicleType } from '../common/enum/vehicleType.enum';

@Schema({ timestamps: true })
export class VechileInvoice extends Document {
  @Prop({ type: Types.ObjectId, ref: 'invoices', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  ownerName: string;

  // Vehicle Identity
  @Prop({ enum: VehicleType, required: true })
  vehicle_type: VehicleType;

  @Prop({ type: String, required: true })
  make: string;

  @Prop({ type: String, required: true, alias: 'model' })
  model_name: string;

  @Prop({ type: String, required: true })
  variant: string;

  @Prop({ enum: FuelType, required: true })
  fuel_type: FuelType;

  // Identification
  @Prop({ type: String, required: true })
  registration_number: string;

  @Prop({ type: String, required: true })
  chassis_number: string;

  @Prop({ type: String, required: true })
  engine_number: string;

  // Manufacturing & History
  @Prop({ type: String, required: true })
  color: string;

  @Prop({ type: Number, required: true })
  year_of_manufacture: number;

  @Prop({ type: Date, required: true })
  vehicle_purchase_date: Date;

  @Prop({
    enum: VechicleStatus,
    required: true,
    default: VechicleStatus.PURCHASED,
  })
  vechicleStatus: VechicleStatus;
}
export type VechileInvoiceDocument = VechileInvoice & Document;
export const VechileInvoiceSchema = SchemaFactory.createForClass(VechileInvoice);