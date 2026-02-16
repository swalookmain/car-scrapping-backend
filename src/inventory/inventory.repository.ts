import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  async createMany(records: Partial<Inventory>[]) {
    return this.inventoryModel.insertMany(records);
  }

  async findById(id: string) {
    return this.inventoryModel.findById(id);
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

  async findPaginated(filter: Record<string, unknown>, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.inventoryModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.inventoryModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async updateById(id: string, updateData: Record<string, unknown>) {
    return this.inventoryModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id: string) {
    return this.inventoryModel.findByIdAndDelete(id);
  }
}
