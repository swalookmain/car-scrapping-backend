import { BadRequestException } from '@nestjs/common';
import { InventoryAuditQueryDto } from './dto/inventory-audit-query.dto';

export interface Form3Preview {
  header: {
    name: string;
    registrationNumber: string;
    validity: string;
    financialYear: string;
    periodLabel: string;
  };
  capacity: {
    deregistration: Array<{
      key: string;
      label: string;
      completed: number;
      inProcess: number;
      total: number;
    }>;
    deregistrationTotals: {
      completed: number;
      inProcess: number;
      total: number;
    };
    treatment: Array<{
      key: string;
      label: string;
      authorised: number;
      utilised: number;
      utilisationPct: string;
    }>;
  };
  massFlow: {
    inwards: Array<{ key: string; label: string; kg: number }>;
    inwardsGrandTotal: number;
    outwards: Array<{ key: string; label: string; kg: number }>;
    outwardsSubTotal: number;
    hazReprocess: Array<{ key: string; label: string; kg: number }>;
    hazReprocessSubTotal: number;
    hazLandfill: Array<{ key: string; label: string; kg: number }>;
    hazLandfillSubTotal: number;
    grandTotalOut: number;
    massBalance: number;
  };
  guards: {
    unmappedPartCount: number;
    unmappedWeightKg: number;
    missingGrossWeightCount: number;
    vehicleCount: number;
  };
  from: string;
  to: string;
}

const CLASS_LABELS: Record<string, string> = {
  L: 'L VEHS',
  M: 'M VEHS',
  N: 'N VEHS',
  OTHER: 'OTHERS',
};

function pct(utilised: number, authorised: number): string {
  if (!authorised || authorised <= 0) return '0.00';
  return ((utilised / authorised) * 100).toFixed(2);
}

function indianFyLabel(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  // FY starts April (month 3)
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

export function resolveDateRange(query: InventoryAuditQueryDto): {
  from: Date;
  to: Date;
  financialYearLabel: string;
  periodLabel: string;
} {
  const now = new Date();
  let from: Date;
  let to: Date;
  let periodLabel: string;

  if (query.from && query.to) {
    from = new Date(query.from);
    to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from/to dates');
    }
    if (from > to) throw new BadRequestException('from must be before to');
    to.setHours(23, 59, 59, 999);
    periodLabel = 'Custom';
  } else if (query.period === 'week') {
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
    from = new Date(to);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    periodLabel = 'Weekly';
  } else if (query.period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    periodLabel = 'Monthly';
  } else {
    // FY (default): Apr 1 -> Mar 31
    const y = now.getFullYear();
    const m = now.getMonth();
    const fyStartYear = m >= 3 ? y : y - 1;
    from = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    to = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
    periodLabel = 'Financial Year';
  }

  return {
    from,
    to,
    financialYearLabel: indianFyLabel(from.getMonth() >= 3 ? from : to),
    periodLabel,
  };
}

export function buildForm3Preview(input: {
  facility: {
    name?: string;
    registrationNumber?: string;
    validity?: string;
    authorisedCapacity?: { L?: number; M?: number; N?: number; OTHER?: number };
  };
  financialYearLabel: string;
  periodLabel: string;
  from: Date;
  to: Date;
  capacityRows: Record<string, { completed: number; inProcess: number }>;
  inwardsByClass: Record<string, number>;
  outwards: Record<string, number>;
  hazReprocess: Record<string, number>;
  hazLandfill: Record<string, number>;
  guards: Form3Preview['guards'];
}): Form3Preview {
  const keys = ['L', 'M', 'N', 'OTHER'] as const;
  const auth = input.facility.authorisedCapacity || {};

  const deregistration = keys.map((key) => {
    const row = input.capacityRows[key] || { completed: 0, inProcess: 0 };
    return {
      key,
      label: CLASS_LABELS[key],
      completed: row.completed,
      inProcess: row.inProcess,
      total: row.completed + row.inProcess,
    };
  });
  const deregistrationTotals = deregistration.reduce(
    (acc, r) => ({
      completed: acc.completed + r.completed,
      inProcess: acc.inProcess + r.inProcess,
      total: acc.total + r.total,
    }),
    { completed: 0, inProcess: 0, total: 0 },
  );

  const treatment = keys.map((key) => {
    const utilised = input.capacityRows[key]?.completed || 0;
    const authorised = Number(auth[key] || 0);
    return {
      key,
      label: CLASS_LABELS[key],
      authorised,
      utilised,
      utilisationPct: pct(utilised, authorised),
    };
  });

  const inwards = keys.map((key) => ({
    key,
    label: CLASS_LABELS[key],
    kg: Number((input.inwardsByClass[key] || 0).toFixed(3)),
  }));
  const inwardsGrandTotal = inwards.reduce((s, r) => s + r.kg, 0);

  const outwardsOrder = [
    ['FERROUS', 'FERROUS'],
    ['ALUMINIUM', 'ALUMINIUM'],
    ['COPPER', 'COPPER'],
    ['PLASTICS', 'PLASTICS'],
    ['GLASS', 'GLASS'],
    ['TYRES', 'TYRES'],
    ['PRECIOUS_METALS', 'PRECIOUS METALS'],
    ['OTHERS', 'OTHERS'],
  ] as const;
  const outwards = outwardsOrder.map(([key, label]) => ({
    key,
    label,
    kg: Number((input.outwards[key] || 0).toFixed(3)),
  }));
  const outwardsSubTotal = outwards.reduce((s, r) => s + r.kg, 0);

  const hazOrder = [
    ['FUEL', 'FUEL'],
    ['OILS', 'OILS'],
    ['GASES', 'GASES'],
    ['BATTERIES', 'BATTERIES'],
    ['FLUIDS', 'FLUIDS'],
  ] as const;
  const hazReprocess = hazOrder.map(([key, label]) => ({
    key,
    label,
    kg: Number((input.hazReprocess[key] || 0).toFixed(3)),
  }));
  const hazReprocessSubTotal = hazReprocess.reduce((s, r) => s + r.kg, 0);

  const landfillOrder = [
    ['RESIDUES_RETAINED', 'RESIDUES RETAINED'],
    ['LANDFILL', 'LANDFILL'],
  ] as const;
  const hazLandfill = landfillOrder.map(([key, label]) => ({
    key,
    label,
    kg: Number((input.hazLandfill[key] || 0).toFixed(3)),
  }));
  const hazLandfillSubTotal = hazLandfill.reduce((s, r) => s + r.kg, 0);

  const grandTotalOut =
    outwardsSubTotal + hazReprocessSubTotal + hazLandfillSubTotal;
  const massBalance = Number((inwardsGrandTotal - grandTotalOut).toFixed(3));

  return {
    header: {
      name: input.facility.name || '',
      registrationNumber: input.facility.registrationNumber || '',
      validity: input.facility.validity || '',
      financialYear: input.financialYearLabel,
      periodLabel: input.periodLabel,
    },
    capacity: { deregistration, deregistrationTotals, treatment },
    massFlow: {
      inwards,
      inwardsGrandTotal: Number(inwardsGrandTotal.toFixed(3)),
      outwards,
      outwardsSubTotal: Number(outwardsSubTotal.toFixed(3)),
      hazReprocess,
      hazReprocessSubTotal: Number(hazReprocessSubTotal.toFixed(3)),
      hazLandfill,
      hazLandfillSubTotal: Number(hazLandfillSubTotal.toFixed(3)),
      grandTotalOut: Number(grandTotalOut.toFixed(3)),
      massBalance,
    },
    guards: input.guards,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
  };
}
