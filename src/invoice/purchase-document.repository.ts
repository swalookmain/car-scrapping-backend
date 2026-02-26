import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PurchaseDocument,
  PurchaseDocumentDocument,
} from './purchase-document.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class PurchaseDocumentRepository extends BaseRepository<PurchaseDocumentDocument> {
  constructor(
    @InjectModel(PurchaseDocument.name)
    purchaseDocumentModel: Model<PurchaseDocumentDocument>,
  ) {
    super(purchaseDocumentModel);
  }

  createMany(docs: Partial<PurchaseDocument>[]) {
    return this.model.insertMany(docs);
  }

  findByInvoiceAndOrg(invoiceId: string, orgId: string) {
    return this.model
      .find({
        invoiceId: new Types.ObjectId(invoiceId),
        organizationId: new Types.ObjectId(orgId),
      })
      .sort({ createdAt: -1 });
  }
}
