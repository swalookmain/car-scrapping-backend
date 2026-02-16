import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './invoice.schema';
import {
  VechileInvoice,
  VechileInvoiceDocument,
} from './vechile-invoice.schema';
import {
  PurchaseDocument,
  PurchaseDocumentDocument,
} from './purchase-document.schema';

@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(VechileInvoice.name)
    private readonly vechileInvoiceModel: Model<VechileInvoiceDocument>,
    @InjectModel(PurchaseDocument.name)
    private readonly purchaseDocumentModel: Model<PurchaseDocumentDocument>,
  ) {}

  async createInvoice(invoiceData: Partial<Invoice>) {
    return this.invoiceModel.create(invoiceData);
  }

  async findInvoiceById(id: string) {
    return this.invoiceModel.findById(id);
  }

  async findInvoices(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ) {
    console.log('filter', filter);
    console.log('page', page);
    console.log('limit', limit);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.invoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.invoiceModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async updateInvoice(id: string, updateData: Record<string, unknown>) {
    return this.invoiceModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteInvoice(id: string) {
    return this.invoiceModel.findByIdAndDelete(id);
  }

  async createVechileInvoice(vechileInvoiceData: Partial<VechileInvoice>) {
    return this.vechileInvoiceModel.create(vechileInvoiceData);
  }

  async findVechileInvoiceById(id: string) {
    return this.vechileInvoiceModel.findById(id);
  }



  async findVechileInvoices(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.vechileInvoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.vechileInvoiceModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async updateVechileInvoice(
    id: string,
    updateData: Partial<VechileInvoice>,
  ) {
    return this.vechileInvoiceModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }

  async deleteVechileInvoice(id: string) {
    return this.vechileInvoiceModel.findByIdAndDelete(id);
  }

  async deleteVechileInvoices(invoiceId: string) {
    return this.vechileInvoiceModel.deleteMany({ invoiceId });
  }

  async createPurchaseDocuments(docs: Partial<PurchaseDocument>[]) {
    return this.purchaseDocumentModel.insertMany(docs);
  }

  async findPurchaseDocumentsByInvoice(invoiceId: string, orgId: string) {
    return this.purchaseDocumentModel
      .find({
        invoiceId: new Types.ObjectId(invoiceId),
        organizationId: new Types.ObjectId(orgId),
      })
      .sort({ createdAt: -1 });
  }

  async getInvoiceById(id: string) {
    return this.invoiceModel.findById(id);
  }
  async getVechileInvoiceById(id: string) {
    return this.vechileInvoiceModel.findById(id);
  }

  async getVechileInvoiceByRegistrationNumber(registrationNumber: string) {
    return this.vechileInvoiceModel.findOne({
      registration_number: registrationNumber,
    });
  }
}
