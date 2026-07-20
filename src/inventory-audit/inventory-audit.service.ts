import {
  BadRequestException,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { FormVehicleClass } from 'src/common/enum/formVehicleClass.enum';
import { InventoryFormBucket } from 'src/common/enum/materialFormSection.enum';
import { YardVehicleStatus } from 'src/common/enum/yardVehicleStatus.enum';
import { VechicleStatus } from 'src/common/enum/vechicleStatus.enum';
import { defaultFormVehicleClass } from 'src/common/utils/form-vehicle-class.util';
import { OrganizationFacilitySettingsService } from 'src/organizations/organization-facility-settings.service';
import { Inventory } from 'src/inventory/inventory.schema';
import { VechileInvoice } from 'src/invoice/vechile-invoice.schema';
import { YardVehicle } from 'src/yard/yard-vehicle.schema';
import { InventoryAuditQueryDto } from './dto/inventory-audit-query.dto';
import {
  buildForm3Preview,
  resolveDateRange,
  type Form3Preview,
} from './inventory-audit.mapper';

@Injectable()
export class InventoryAuditService {
  private readonly page1Path = path.join(__dirname, 'templates', 'form3-page1.hbs');
  private readonly page2Path = path.join(__dirname, 'templates', 'form3-page2.hbs');

  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<Inventory>,
    @InjectModel(VechileInvoice.name)
    private readonly vehicleModel: Model<VechileInvoice>,
    @InjectModel(YardVehicle.name)
    private readonly yardVehicleModel: Model<YardVehicle>,
    private readonly facilitySettingsService: OrganizationFacilitySettingsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    if (!user.orgId) throw new BadRequestException('Organization not found');
    return user.orgId;
  }

  async preview(
    user: AuthenticatedUser,
    query: InventoryAuditQueryDto,
  ): Promise<Form3Preview> {
    const orgId = this.getOrgId(user);
    const range = resolveDateRange(query);
    const facility = await this.facilitySettingsService.getByOrganizationId(orgId);
    const payload = await this.collectPayload(orgId, range.from, range.to);
    return buildForm3Preview({
      facility,
      financialYearLabel: range.financialYearLabel,
      periodLabel: range.periodLabel,
      from: range.from,
      to: range.to,
      ...payload,
    });
  }

  async generatePdf(
    user: AuthenticatedUser,
    query: InventoryAuditQueryDto,
  ): Promise<Buffer> {
    const preview = await this.preview(user, query);

    if (preview.guards.unmappedPartCount > 0) {
      throw new BadRequestException(
        `Cannot export FORM-3: ${preview.guards.unmappedPartCount} part(s) have unmapped materials. Map material codes first.`,
      );
    }
    if (preview.guards.missingGrossWeightCount > 0) {
      throw new BadRequestException(
        `Cannot export FORM-3: ${preview.guards.missingGrossWeightCount} vehicle(s) missing grossWeightKg.`,
      );
    }

    const page1Src = fs.readFileSync(this.page1Path, 'utf8');
    const page2Src = fs.readFileSync(this.page2Path, 'utf8');
    const page1Html = Handlebars.compile(page1Src)(preview);
    const page2Html = Handlebars.compile(page2Src)(preview);
    const html = `${page1Html}<div style="page-break-after: always;"></div>${page2Html}`;

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async collectPayload(orgId: string, from: Date, to: Date) {
    const orgOid = new Types.ObjectId(orgId);

    const yardInRange = await this.yardVehicleModel
      .find({
        organizationId: orgOid,
        dismantledAt: { $gte: from, $lte: to },
      })
      .select('vehicleInvoiceId dismantledAt currentStatus')
      .lean();

    const dismantledVehicleIds = new Set(
      yardInRange.map((y) => y.vehicleInvoiceId.toString()),
    );

    const inventoryAgg = await this.inventoryModel.aggregate([
      {
        $lookup: {
          from: 'vechileinvoices',
          localField: 'vechileId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: '$vehicle' },
      {
        $match: {
          'vehicle.organizationId': orgOid,
          'vehicle.isDeleted': { $ne: true },
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            vechileId: '$vechileId',
            materialCode: '$materialCode',
            formBucket: '$formBucket',
          },
          weightKg: { $sum: { $ifNull: ['$weightKg', 0] } },
          partCount: { $sum: 1 },
          firstCreatedAt: { $min: '$createdAt' },
        },
      },
    ]);

    const inventoryVehicleIds = new Set(
      inventoryAgg.map((r) => r._id.vechileId.toString()),
    );

    const allVehicleIds = new Set([
      ...dismantledVehicleIds,
      ...inventoryVehicleIds,
    ]);

    const vehicles = allVehicleIds.size
      ? await this.vehicleModel
          .find({
            _id: {
              $in: [...allVehicleIds].map((id) => new Types.ObjectId(id)),
            },
            organizationId: orgOid,
            isDeleted: { $ne: true },
          })
          .lean()
      : [];

    const yardByVehicle = new Map(
      yardInRange.map((y) => [y.vehicleInvoiceId.toString(), y]),
    );

    const includedVehicles = vehicles.filter((v) => {
      const id = v._id.toString();
      if (yardByVehicle.has(id)) return true;
      // fallback: earliest inventory createdAt in range (already filtered by agg)
      return inventoryVehicleIds.has(id);
    });

    const capacityRows = {
      L: { completed: 0, inProcess: 0 },
      M: { completed: 0, inProcess: 0 },
      N: { completed: 0, inProcess: 0 },
      OTHER: { completed: 0, inProcess: 0 },
    };

    let missingGrossWeightCount = 0;
    const inwardsByClass: Record<string, number> = {
      L: 0,
      M: 0,
      N: 0,
      OTHER: 0,
    };

    for (const v of includedVehicles) {
      const cls =
        (v.formVehicleClass as FormVehicleClass) ||
        defaultFormVehicleClass(v.vehicle_type);
      const key = cls in capacityRows ? cls : FormVehicleClass.OTHER;
      const status = v.vechicleStatus;
      const yard = yardByVehicle.get(v._id.toString());
      const yardStatus = yard?.currentStatus;

      const completed =
        status === VechicleStatus.DISMANTLED ||
        status === VechicleStatus.SOLD_OUT ||
        yardStatus === YardVehicleStatus.DISMANTLED ||
        yardStatus === YardVehicleStatus.EXITED;
      const inProcess =
        status === VechicleStatus.DISMANTLING_IN_PROGRESS ||
        yardStatus === YardVehicleStatus.DISMANTLING_IN_PROGRESS;

      if (completed) capacityRows[key].completed += 1;
      else if (inProcess) capacityRows[key].inProcess += 1;
      else capacityRows[key].completed += 1; // inventory activity implies processed

      const gw = typeof v.grossWeightKg === 'number' ? v.grossWeightKg : null;
      if (gw === null || gw <= 0) missingGrossWeightCount += 1;
      else inwardsByClass[key] += gw;
    }

    const outwards: Record<string, number> = {
      FERROUS: 0,
      ALUMINIUM: 0,
      COPPER: 0,
      PLASTICS: 0,
      GLASS: 0,
      TYRES: 0,
      PRECIOUS_METALS: 0,
      OTHERS: 0,
    };
    const hazReprocess: Record<string, number> = {
      FUEL: 0,
      OILS: 0,
      GASES: 0,
      BATTERIES: 0,
      FLUIDS: 0,
    };
    const hazLandfill: Record<string, number> = {
      RESIDUES_RETAINED: 0,
      LANDFILL: 0,
    };

    let unmappedPartCount = 0;
    let unmappedWeightKg = 0;

    for (const row of inventoryAgg) {
      const code = (row._id.materialCode || '').toUpperCase();
      const bucket = row._id.formBucket as InventoryFormBucket;
      const w = row.weightKg || 0;

      if (
        !code ||
        bucket === InventoryFormBucket.UNMAPPED ||
        bucket === undefined ||
        bucket === null
      ) {
        unmappedPartCount += row.partCount || 0;
        unmappedWeightKg += w;
        continue;
      }

      if (bucket === InventoryFormBucket.OUTWARDS) {
        if (code in outwards) outwards[code] += w;
        else outwards.OTHERS += w;
      } else if (bucket === InventoryFormBucket.HAZ_REPROCESS) {
        if (code in hazReprocess) hazReprocess[code] += w;
        else hazReprocess.FLUIDS += w;
      } else if (bucket === InventoryFormBucket.HAZ_LANDFILL) {
        if (code in hazLandfill) hazLandfill[code] += w;
        else hazLandfill.LANDFILL += w;
      } else {
        unmappedPartCount += row.partCount || 0;
        unmappedWeightKg += w;
      }
    }

    return {
      capacityRows,
      inwardsByClass,
      outwards,
      hazReprocess,
      hazLandfill,
      guards: {
        unmappedPartCount,
        unmappedWeightKg,
        missingGrossWeightCount,
        vehicleCount: includedVehicles.length,
      },
    };
  }
}
