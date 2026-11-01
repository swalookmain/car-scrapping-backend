import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';
import { BaseRepository } from 'src/common/repository/base.repository';
import { dateWindowFilter } from 'src/common/utils/date-range.util';

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

  async findByYardVehicleId(yardVehicleId: string) {
    return this.inventoryModel.find({
      yardVehicleId: new Types.ObjectId(yardVehicleId),
    });
  }

  async existsByVehicleId(vechileId: string) {
    return this.inventoryModel.exists({
      vechileId: new Types.ObjectId(vechileId),
    });
  }

  async existsByYardVehicleId(yardVehicleId: string) {
    return this.inventoryModel.exists({
      yardVehicleId: new Types.ObjectId(yardVehicleId),
    });
  }

  async aggregateVehicles(params: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
    invoiceIds?: Types.ObjectId[];
    fromDate?: string;
    toDate?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const matchStage: Record<string, unknown> = {};
    if (params.organizationId) {
      const orgClauses: Record<string, unknown>[] = [
        { organizationId: new Types.ObjectId(params.organizationId) },
      ];
      if (params.invoiceIds?.length) {
        orgClauses.push({ invoiceId: { $in: params.invoiceIds } });
      }
      matchStage.$or = orgClauses;
    } else if (params.invoiceIds) {
      matchStage.invoiceId = { $in: params.invoiceIds };
    }
    Object.assign(
      matchStage,
      dateWindowFilter('businessDate', params.fromDate, params.toDate, 'createdAt') ?? {},
    );

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          // Canonical vehicle identity is yardVehicleId (legacy rows may only have vechileId)
          _id: { $ifNull: ['$yardVehicleId', '$vechileId'] },
          yardVehicleId: { $first: '$yardVehicleId' },
          vechileId: { $first: '$vechileId' },
          partCount: { $sum: 1 },
          totalWeightKg: { $sum: { $ifNull: ['$weightKg', 0] } },
          invoiceId: { $first: '$invoiceId' },
          purchaseInvoiceNumber: { $first: '$purchaseInvoiceNumber' },
          registrationNumber: { $first: '$registrationNumber' },
          vechileModel: { $first: '$vechileModel' },
          lastUpdatedAt: { $max: '$updatedAt' },
          createdAt: { $min: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'vechileinvoices',
          localField: 'vechileId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'yardvehicles',
          localField: 'yardVehicleId',
          foreignField: '_id',
          as: 'yardVehicle',
        },
      },
      { $unwind: { path: '$yardVehicle', preserveNullAndEmptyArrays: true } },
    ];

    if (params.search?.trim()) {
      const q = params.search.trim();
      pipeline.push({
        $match: {
          $or: [
            { 'vehicle.registration_number': { $regex: q, $options: 'i' } },
            { 'vehicle.make': { $regex: q, $options: 'i' } },
            { 'vehicle.model_name': { $regex: q, $options: 'i' } },
            { 'yardVehicle.registrationNumber': { $regex: q, $options: 'i' } },
            { 'yardVehicle.make': { $regex: q, $options: 'i' } },
            { 'yardVehicle.modelName': { $regex: q, $options: 'i' } },
            { registrationNumber: { $regex: q, $options: 'i' } },
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
              vechileId: 1,
              yardVehicleId: 1,
              partCount: 1,
              totalWeightKg: 1,
              invoiceId: 1,
              purchaseInvoiceNumber: 1,
              vechileModel: 1,
              lastUpdatedAt: 1,
              createdAt: 1,
              registrationNumber: {
                $ifNull: [
                  '$registrationNumber',
                  {
                    $ifNull: [
                      '$yardVehicle.registrationNumber',
                      '$vehicle.registration_number',
                    ],
                  },
                ],
              },
              make: {
                $ifNull: ['$yardVehicle.make', '$vehicle.make'],
              },
              modelName: {
                $ifNull: ['$yardVehicle.modelName', '$vehicle.model_name'],
              },
              vehicleStatus: {
                $ifNull: [
                  '$yardVehicle.currentStatus',
                  '$vehicle.vechicleStatus',
                ],
              },
              formVehicleClass: '$vehicle.formVehicleClass',
              grossWeightKg: {
                $ifNull: ['$yardVehicle.grossWeightKg', '$vehicle.grossWeightKg'],
              },
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
