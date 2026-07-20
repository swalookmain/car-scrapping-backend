import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
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

  async aggregateVehicles(params: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const matchStage: Record<string, unknown> = {};

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$vechileId',
          partCount: { $sum: 1 },
          totalWeightKg: { $sum: { $ifNull: ['$weightKg', 0] } },
          invoiceId: { $first: '$invoiceId' },
          purchaseInvoiceNumber: { $first: '$purchaseInvoiceNumber' },
          vechileModel: { $first: '$vechileModel' },
          lastUpdatedAt: { $max: '$updatedAt' },
          createdAt: { $min: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'vechileinvoices',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
    ];

    if (params.organizationId) {
      pipeline.push({
        $match: {
          'vehicle.organizationId': new Types.ObjectId(params.organizationId),
          'vehicle.isDeleted': { $ne: true },
        },
      });
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      pipeline.push({
        $match: {
          $or: [
            { 'vehicle.registration_number': { $regex: q, $options: 'i' } },
            { 'vehicle.make': { $regex: q, $options: 'i' } },
            { 'vehicle.model_name': { $regex: q, $options: 'i' } },
            { purchaseInvoiceNumber: { $regex: q, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { lastUpdatedAt: -1 } },
          { $skip: skip },
          { $limit: params.limit },
          {
            $project: {
              vechileId: '$_id',
              partCount: 1,
              totalWeightKg: 1,
              invoiceId: 1,
              purchaseInvoiceNumber: 1,
              vechileModel: 1,
              lastUpdatedAt: 1,
              createdAt: 1,
              registrationNumber: '$vehicle.registration_number',
              make: '$vehicle.make',
              modelName: '$vehicle.model_name',
              vehicleStatus: '$vehicle.vechicleStatus',
              formVehicleClass: '$vehicle.formVehicleClass',
              grossWeightKg: '$vehicle.grossWeightKg',
              vehicleType: '$vehicle.vehicle_type',
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await this.inventoryModel.aggregate(pipeline).exec();
    const data = result?.data ?? [];
    const total = result?.totalCount?.[0]?.count ?? 0;
    const totalPages = Math.ceil(total / params.limit) || 0;

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
      },
    };
  }
}
