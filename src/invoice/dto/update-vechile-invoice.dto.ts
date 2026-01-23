import { PartialType } from '@nestjs/swagger';
import { CreateVechileInvoiceDto } from './create-vechile-invoice.dto';

export class UpdateVechileInvoiceDto extends PartialType(
  CreateVechileInvoiceDto,
) {}
