import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { LotDocument, LotDocumentRecord } from '../schemas/lot-document.schema';

@Injectable()
export class LotDocumentRepository extends BaseRepository<LotDocumentRecord> {
  constructor(
    @InjectModel(LotDocument.name) lotDocumentModel: Model<LotDocumentRecord>,
  ) {
    super(lotDocumentModel);
  }

  async findLatestByLotAndType(
    organizationId: string,
    lotId: string,
    documentType: string,
  ) {
    return this.model
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        lotId: new Types.ObjectId(lotId),
        documentType,
      })
      .sort({ createdAt: -1 });
  }
}
