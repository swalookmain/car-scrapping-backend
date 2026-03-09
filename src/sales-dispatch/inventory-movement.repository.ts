import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repository/base.repository';
import {
  InventoryMovement,
  InventoryMovementDocument,
} from './inventory-movement.schema';

@Injectable()
export class InventoryMovementRepository extends BaseRepository<InventoryMovementDocument> {
  constructor(
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
  ) {
    super(inventoryMovementModel);
  }

  async createMany(movements: Partial<InventoryMovement>[]) {
    return this.inventoryMovementModel.insertMany(movements);
  }
}
