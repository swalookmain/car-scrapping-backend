import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { LeadStatus } from 'src/common/enum/leadStatus.enum';
import { AuctionStatus } from 'src/common/enum/auctionStatus.enum';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';
import { SalesInvoiceStatus } from 'src/common/enum/salesInvoiceStatus.enum';
import { RtoStatus } from 'src/common/enum/rtoStatus.enum';
import { Lead, LeadDocument } from 'src/lead/lead.schema';
import { Auction, AuctionDocument } from 'src/auction/auction.schema';
import { YardVehicle, YardVehicleDocument } from 'src/yard/yard-vehicle.schema';
import { Invoice, InvoiceDocument } from 'src/invoice/invoice.schema';
import {
  SalesInvoice,
  SalesInvoiceDocument,
} from 'src/sales-dispatch/sales-invoice.schema';
import {
  VehicleCodRecord,
  VehicleCodRecordDocument,
} from 'src/vehicle-compliance/vehicle-cod-record.schema';
import { Inventory, InventoryDocument } from 'src/inventory/inventory.schema';
import { Document } from 'mongoose';
import {
  organizations,
} from 'src/organizations/organizations.schema';

type OrganizationDocument = organizations & Document;

export interface DashboardAlert {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(organizations.name)
    private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    @InjectModel(Auction.name)
    private readonly auctionModel: Model<AuctionDocument>,
    @InjectModel(YardVehicle.name)
    private readonly yardVehicleModel: Model<YardVehicleDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(VehicleCodRecord.name)
    private readonly codModel: Model<VehicleCodRecordDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  async getOverview(authenticatedUser: AuthenticatedUser) {
    const orgId = authenticatedUser.orgId;
    if (!orgId) {
      throw new ForbiddenException('User not assigned to organization');
    }

    const orgObjectId = new Types.ObjectId(orgId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yardStatuses = Object.values(YardVehicleStatus);
    const notDeletedInvoice = {
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    };

    const [
      organization,
      openLeads,
      inProcessLeads,
      activeAuctions,
      purchaseCountMtd,
      purchaseCountPrev,
      totalPurchases,
      salesRevenueMtd,
      salesRevenuePrev,
      purchaseSpendMtd,
      purchaseSpendPrev,
      salesConfirmedMtd,
      codPending,
      rtoPending,
      draftSalesInvoices,
      staleLeads,
      partsInStock,
      auctionsEndingSoon,
      upcomingAuctions,
      weeklyPurchaseTrend,
      weeklySalesTrend,
      ...yardCountResults
    ] = await Promise.all([
      this.organizationModel.findById(orgId).select('name').lean(),
      this.leadModel.countDocuments({
        organizationId: orgObjectId,
        status: LeadStatus.OPEN,
      }),
      this.leadModel.countDocuments({
        organizationId: orgObjectId,
        status: LeadStatus.IN_PROCESS,
      }),
      this.auctionModel.countDocuments({
        organizationId: orgObjectId,
        status: { $in: [AuctionStatus.UPCOMING, AuctionStatus.ONGOING] },
        endDateTime: { $gte: now },
      }),
      this.invoiceModel.countDocuments({
        organizationId: orgObjectId,
        purchaseDate: { $gte: monthStart, $lte: now },
        ...notDeletedInvoice,
      }),
      this.invoiceModel.countDocuments({
        organizationId: orgObjectId,
        purchaseDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
        ...notDeletedInvoice,
      }),
      this.invoiceModel.countDocuments({
        organizationId: orgObjectId,
        ...notDeletedInvoice,
      }),
      this.sumSalesRevenue(orgId, monthStart, now),
      this.sumSalesRevenue(orgId, prevMonthStart, prevMonthEnd),
      this.sumPurchaseSpend(orgId, monthStart, now),
      this.sumPurchaseSpend(orgId, prevMonthStart, prevMonthEnd),
      this.salesInvoiceModel.countDocuments({
        organizationId: orgObjectId,
        status: SalesInvoiceStatus.CONFIRMED,
        invoiceDate: { $gte: monthStart, $lte: now },
      }),
      this.codModel.countDocuments({
        organizationId: orgObjectId,
        codGenerated: false,
      }),
      this.codModel.countDocuments({
        organizationId: orgObjectId,
        rtoStatus: { $ne: RtoStatus.APPROVED },
      }),
      this.salesInvoiceModel.countDocuments({
        organizationId: orgObjectId,
        status: SalesInvoiceStatus.DRAFT,
      }),
      this.leadModel.countDocuments({
        organizationId: orgObjectId,
        status: { $in: [LeadStatus.OPEN, LeadStatus.IN_PROCESS] },
        updatedAt: { $lt: sevenDaysAgo },
      }),
      this.countPartsInStock(orgObjectId),
      this.auctionModel
        .find({
          organizationId: orgObjectId,
          status: { $in: [AuctionStatus.UPCOMING, AuctionStatus.ONGOING] },
          endDateTime: { $gte: now, $lte: twoDaysAhead },
        })
        .select('auctionNumber endDateTime _id')
        .sort({ endDateTime: 1 })
        .limit(5)
        .lean(),
      this.auctionModel
        .find({
          organizationId: orgObjectId,
          status: { $in: [AuctionStatus.UPCOMING, AuctionStatus.ONGOING] },
          endDateTime: { $gte: now },
        })
        .select('auctionNumber endDateTime startDateTime auctionerName status')
        .sort({ endDateTime: 1 })
        .limit(6)
        .lean(),
      this.getWeeklyPurchaseTrend(orgId, sixWeeksAgo, now),
      this.getWeeklySalesTrend(orgId, sixWeeksAgo, now),
      ...yardStatuses.map((status) =>
        this.yardVehicleModel.countDocuments({
          organizationId: orgObjectId,
          currentStatus: status,
        }),
      ),
    ]);

    const yardByStatus = yardStatuses.map((status, index) => ({
      status,
      count: yardCountResults[index] as number,
    }));

    const yardTotal = yardByStatus
      .filter((item) => item.status !== YardVehicleStatus.EXITED)
      .reduce((sum, item) => sum + item.count, 0);

    const activeLeads = openLeads + inProcessLeads;
    const dismantling =
      yardByStatus.find(
        (item) => item.status === YardVehicleStatus.DISMANTLING_IN_PROGRESS,
      )?.count ?? 0;

    const alerts = this.buildAlerts({
      auctionsEndingSoon,
      codPending,
      draftSalesInvoices,
      staleLeads,
      rtoPending,
    });

    const weeklyActivity = this.mergeWeeklyTrends(
      weeklyPurchaseTrend,
      weeklySalesTrend,
    );

    const yardInProgress = yardByStatus
      .filter(
        (item) =>
          item.status !== YardVehicleStatus.EXITED &&
          item.status !== YardVehicleStatus.AWAITING_ARRIVAL,
      )
      .reduce((sum, item) => sum + item.count, 0);

    const yardUtilization =
      yardTotal > 0 ? Math.round((yardInProgress / yardTotal) * 100) : 0;

    const netCashFlow = salesRevenueMtd - purchaseSpendMtd;
    const sellThroughRatio =
      purchaseSpendMtd > 0
        ? Math.round((salesRevenueMtd / purchaseSpendMtd) * 100)
        : null;

    return {
      organization: {
        id: orgId,
        name: organization?.name ?? 'Your Organization',
      },
      user: {
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
      period: {
        from: monthStart.toISOString(),
        to: now.toISOString(),
        label: 'This month',
      },
      kpis: {
        yardTotal,
        activeLeads,
        openLeads,
        activeAuctions,
        partsInStock,
        salesRevenueMtd,
        codPending,
        purchaseCountMtd,
        salesConfirmedMtd,
        dismantling,
        purchaseSpendMtd,
        rtoPending,
        draftSalesInvoices,
      },
      trends: {
        salesRevenueMtd: {
          value: salesRevenueMtd,
          changePercent: this.calcChangePercent(
            salesRevenueMtd,
            salesRevenuePrev,
          ),
        },
        purchaseCountMtd: {
          value: purchaseCountMtd,
          changePercent: this.calcChangePercent(
            purchaseCountMtd,
            purchaseCountPrev,
          ),
        },
        purchaseSpendMtd: {
          value: purchaseSpendMtd,
          changePercent: this.calcChangePercent(
            purchaseSpendMtd,
            purchaseSpendPrev,
          ),
        },
      },
      compliance: {
        codPending,
        rtoPending,
        draftSalesInvoices,
      },
      pipeline: {
        leads: activeLeads,
        purchases: totalPurchases,
        yard: yardTotal,
        dismantling,
        inventory: partsInStock,
        sales: salesConfirmedMtd,
      },
      yardByStatus,
      alerts,
      leadBreakdown: {
        open: openLeads,
        inProcess: inProcessLeads,
      },
      upcomingAuctions: upcomingAuctions.map((a) => ({
        id: a._id?.toString(),
        auctionNumber: a.auctionNumber,
        auctionerName: a.auctionerName,
        status: a.status,
        endDateTime: a.endDateTime,
        startDateTime: a.startDateTime,
      })),
      weeklyActivity,
      insights: {
        netCashFlow,
        sellThroughRatio,
        yardUtilization,
        vehiclesPurchasedMtd: purchaseCountMtd,
        salesConfirmedMtd,
        dismantling,
      },
      generatedAt: now.toISOString(),
    };
  }

  private async getWeeklyPurchaseTrend(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ week: string; amount: number }>> {
    const rows = await this.invoiceModel.aggregate<{
      _id: string;
      amount: number;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(orgId),
          purchaseDate: { $gte: from, $lte: to },
          $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%U', date: '$purchaseDate' },
          },
          amount: { $sum: '$purchaseAmount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);
    return rows.map((r) => ({ week: r._id, amount: r.amount }));
  }

  private async getWeeklySalesTrend(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ week: string; amount: number }>> {
    const rows = await this.salesInvoiceModel.aggregate<{
      _id: string;
      amount: number;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(orgId),
          status: SalesInvoiceStatus.CONFIRMED,
          invoiceDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%U', date: '$invoiceDate' },
          },
          amount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);
    return rows.map((r) => ({ week: r._id, amount: r.amount }));
  }

  private mergeWeeklyTrends(
    purchases: Array<{ week: string; amount: number }>,
    sales: Array<{ week: string; amount: number }>,
  ) {
    const weekSet = new Set([
      ...purchases.map((p) => p.week),
      ...sales.map((s) => s.week),
    ]);
    const weeks = Array.from(weekSet).sort().slice(-6);
    const purchaseMap = new Map(purchases.map((p) => [p.week, p.amount]));
    const salesMap = new Map(sales.map((s) => [s.week, s.amount]));
    return weeks.map((week, index) => ({
      label: `W${index + 1}`,
      purchases: purchaseMap.get(week) ?? 0,
      sales: salesMap.get(week) ?? 0,
    }));
  }

  private async sumPurchaseSpend(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.invoiceModel.aggregate<{ total: number }>([
      {
        $match: {
          organizationId: new Types.ObjectId(orgId),
          purchaseDate: { $gte: from, $lte: to },
          $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
        },
      },
      { $group: { _id: null, total: { $sum: '$purchaseAmount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private async sumSalesRevenue(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.salesInvoiceModel.aggregate<{ total: number }>([
      {
        $match: {
          organizationId: new Types.ObjectId(orgId),
          status: SalesInvoiceStatus.CONFIRMED,
          invoiceDate: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private async countPartsInStock(orgId: Types.ObjectId): Promise<number> {
    const result = await this.inventoryModel.aggregate<{ total: number }>([
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoiceId',
          foreignField: '_id',
          as: 'inv',
        },
      },
      { $unwind: '$inv' },
      {
        $match: {
          'inv.organizationId': orgId,
          availableQuantity: { $gt: 0 },
        },
      },
      { $count: 'total' },
    ]);
    return result[0]?.total ?? 0;
  }

  private calcChangePercent(current: number, previous: number): number | null {
    if (previous === 0) {
      return current > 0 ? 100 : null;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  private buildAlerts(input: {
    auctionsEndingSoon: Array<{
      _id: Types.ObjectId;
      auctionNumber?: string;
      endDateTime?: Date;
    }>;
    codPending: number;
    draftSalesInvoices: number;
    staleLeads: number;
    rtoPending: number;
  }): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    for (const auction of input.auctionsEndingSoon) {
      alerts.push({
        type: 'AUCTION_ENDING',
        title: `Auction ${auction.auctionNumber ?? ''} ending soon`,
        subtitle: auction.endDateTime
          ? new Date(auction.endDateTime).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        href: `/auctions`,
        priority: 'high',
      });
    }

    if (input.codPending > 0) {
      alerts.push({
        type: 'COD_PENDING',
        title: `${input.codPending} vehicle${input.codPending > 1 ? 's' : ''} need COD`,
        subtitle: 'Compliance documents pending',
        href: '/vehicle-compliance',
        priority: 'high',
      });
    }

    if (input.rtoPending > 0) {
      alerts.push({
        type: 'RTO_PENDING',
        title: `${input.rtoPending} RTO case${input.rtoPending > 1 ? 's' : ''} open`,
        subtitle: 'Track and update RTO status',
        href: '/vehicle-compliance',
        priority: 'medium',
      });
    }

    if (input.draftSalesInvoices > 0) {
      alerts.push({
        type: 'DRAFT_SALES',
        title: `${input.draftSalesInvoices} draft sales invoice${input.draftSalesInvoices > 1 ? 's' : ''}`,
        subtitle: 'Confirm to deduct inventory',
        href: '/sales/invoices',
        priority: 'medium',
      });
    }

    if (input.staleLeads > 0) {
      alerts.push({
        type: 'STALE_LEADS',
        title: `${input.staleLeads} lead${input.staleLeads > 1 ? 's' : ''} inactive 7+ days`,
        subtitle: 'Follow up or update status',
        href: '/leads',
        priority: 'low',
      });
    }

    return alerts.slice(0, 8);
  }
}
