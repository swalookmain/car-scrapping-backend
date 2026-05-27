import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import { YardZone, YardZoneDocument } from './yard-zone.schema';

@Injectable()
export class YardZoneRepository extends BaseRepository<YardZoneDocument> {
  constructor(
    @InjectModel(YardZone.name)
    yardZoneModel: Model<YardZoneDocument>,
  ) {
    super(yardZoneModel);
  }
}
