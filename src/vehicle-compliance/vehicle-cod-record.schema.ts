import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';

@Schema({ timestamps: true, collection: 'vehicle_cod_records' })
export class VehicleCodRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'vechileinvoices',
    required: true,
    unique: true,
  })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'invoices', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Boolean, default: false, required: true })
  codGenerated: boolean;

  @Prop({ type: String })
  codInwardNumber?: string;

  @Prop({ type: Date })
  codIssueDate?: Date;

  @Prop({ type: String })
  rtoOffice?: string;

  @Prop({ enum: RtoStatus, default: RtoStatus.NOT_APPLIED, required: true })
  rtoStatus: RtoStatus;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: String, default: null })
  codDocumentUrl?: string | null;
}

export type VehicleCodRecordDocument = VehicleCodRecord & Document;
export const VehicleCodRecordSchema =
  SchemaFactory.createForClass(VehicleCodRecord);
