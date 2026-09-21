import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LiftingJobStatus } from 'src/common/enum/liftingJobStatus.enum';

@Schema({ timestamps: true, collection: 'lifting_jobs' })
export class LiftingJob extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead', required: true })
  leadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'YardVehicle' })
  yardVehicleId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Date })
  expectedArrivalAt?: Date;

  @Prop({ type: Object })
  snapshot?: {
    leadName?: string;
    ownerName?: string;
    registrationNumber?: string;
    vehicleName?: string;
    variant?: string;
    closingAmount?: number;
    codNumber?: string;
    assignedStaffName?: string;
  };

  @Prop({
    type: String,
    enum: LiftingJobStatus,
    required: true,
    default: LiftingJobStatus.PENDING,
  })
  status: LiftingJobStatus;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export type LiftingJobDocument = LiftingJob & Document;
export const LiftingJobSchema = SchemaFactory.createForClass(LiftingJob);

LiftingJobSchema.index({ organizationId: 1, leadId: 1 }, { unique: true });
LiftingJobSchema.index({ organizationId: 1, status: 1, assignedTo: 1 });
LiftingJobSchema.index({ yardVehicleId: 1 }, { sparse: true });
