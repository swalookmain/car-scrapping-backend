import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LedgerReferenceType } from 'src/common/enum/ledgerReferenceType.enum';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'ledger_entries',
})
export class LedgerEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChartOfAccount', required: true })
  accountId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  debitAmount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  creditAmount: number;

  @Prop({ enum: LedgerReferenceType, required: true })
  referenceType: LedgerReferenceType;

  @Prop({ type: Types.ObjectId, required: true })
  referenceId: Types.ObjectId;
}

export type LedgerEntryDocument = LedgerEntry & Document;
export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);

LedgerEntrySchema.index(
  { organizationId: 1, referenceType: 1, referenceId: 1 },
  { name: 'idx_org_ref' },
);
LedgerEntrySchema.index({ organizationId: 1, createdAt: -1 }, { name: 'idx_org_created' });
