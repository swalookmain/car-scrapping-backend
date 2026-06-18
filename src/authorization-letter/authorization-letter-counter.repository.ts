import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AuthorizationLetterCounter,
} from './authorization-letter-counter.schema';

@Injectable()
export class AuthorizationLetterCounterRepository {
  constructor(
    @InjectModel(AuthorizationLetterCounter.name)
    private readonly counterModel: Model<AuthorizationLetterCounter>,
  ) {}

  async getNextLetterNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.counterModel
      .findOneAndUpdate(
        { year },
        { $inc: { seq: 1 }, $setOnInsert: { year } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();
    const seq = counter?.seq ?? 1;
    return `AL-${year}-${String(seq).padStart(4, '0')}`;
  }
}
