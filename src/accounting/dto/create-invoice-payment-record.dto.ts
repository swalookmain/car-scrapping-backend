import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsMongoId, IsNumber, Min } from 'class-validator';
import { InvoiceType } from 'src/common/enum/invoiceType.enum';
import { PaymentMode } from 'src/common/enum/paymentMode.enum';

export class CreateInvoicePaymentRecordDto {
  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiProperty()
  @IsMongoId()
  invoiceId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  paymentAmount: number;

  @ApiProperty({ description: 'Payment date (ISO 8601)' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;
}
