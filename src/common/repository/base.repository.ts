import { Model, SortOrder } from 'mongoose';

export class BaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  async create(data: Partial<TDocument>) {
    return this.model.create(data);
  }

  async findById(id: string) {
    return this.model.findById(id);
  }

  async findOne(filter: Record<string, unknown>) {
    return this.model.findOne(filter);
  }

  async findAll() {
    return this.model.find();
  }

  async findAllByFilter(filter: Record<string, unknown>) {
    return this.model.find(filter);
  }

  async exists(filter: Record<string, unknown>) {
    return this.model.exists(filter);
  }

  async updateById(id: string, updateData: Record<string, unknown>) {
    return this.model.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id: string) {
    return this.model.findByIdAndDelete(id);
  }

  async findPaginated(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, SortOrder> = { createdAt: -1 },
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(filter),
    ]);
    return { data, total };
  }
}
