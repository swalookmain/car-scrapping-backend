import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';
import { BaseRepository } from 'src/common/repository/base.repository';

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryDocument> {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {
    super(inventoryModel);
  }

  async createMany(records: Partial<Inventory>[]) {
    return this.inventoryModel.insertMany(records);
  }

  async findByVehicleId(vechileId: string) {
    return this.inventoryModel.find({
      vechileId: new Types.ObjectId(vechileId),
    });
  }

  async existsByVehicleId(vechileId: string) {
    return this.inventoryModel.exists({
      vechileId: new Types.ObjectId(vechileId),
    });
  }
}
