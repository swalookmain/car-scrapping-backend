import { Model, PopulateOptions, SortOrder } from 'mongoose';

type PopulateInput = string | PopulateOptions | Array<string | PopulateOptions>;

export class BaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  private applyPopulate<TResult>(query: TResult, populate?: PopulateInput): TResult {
    if (!populate) {
      return query;
    }

    const populateOptions = Array.isArray(populate) ? populate : [populate];

    for (const option of populateOptions) {
      (query as { populate(option: string | PopulateOptions): TResult }).populate(
        option,
      );
    }

    return query;
  }

  async create(data: Partial<TDocument>) {
    return this.model.create(data);
  }

  async findById(id: string, populate?: PopulateInput) {
    return this.applyPopulate(this.model.findById(id), populate);
  }

  async findOne(filter: Record<string, unknown>, populate?: PopulateInput) {
    return this.applyPopulate(this.model.findOne(filter), populate);
  }

  async findAll(populate?: PopulateInput) {
    return this.applyPopulate(this.model.find(), populate);
  }

  async findAllByFilter(filter: Record<string, unknown>, populate?: PopulateInput) {
    return this.applyPopulate(this.model.find(filter), populate);
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
    populate?: PopulateInput,
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.applyPopulate(this.model.find(filter).sort(sort).skip(skip).limit(limit), populate),
      this.model.countDocuments(filter),
    ]);
    return { data, total };
  }
}
