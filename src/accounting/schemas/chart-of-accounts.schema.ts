import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AccountType } from 'src/common/enum/accountType.enum';

@Schema({ timestamps: true, collection: 'chart_of_accounts' })
export class ChartOfAccount extends Document {
  @Prop({ type: Types.ObjectId, ref: 'organizations', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  accountName: string;

  @Prop({ enum: AccountType, required: true })
  accountType: AccountType;

  @Prop({ type: Boolean, default: true, required: true })
  systemGenerated: boolean;
}

export type ChartOfAccountDocument = ChartOfAccount & Document;
export const ChartOfAccountSchema = SchemaFactory.createForClass(ChartOfAccount);

ChartOfAccountSchema.index(
  { organizationId: 1, accountName: 1 },
  { unique: true, name: 'uniq_account_name_org' },
);
