import {
  buildForm3Preview,
  resolveDateRange,
} from './inventory-audit.mapper';

describe('inventory-audit.mapper', () => {
  it('computes capacity % and mass balance', () => {
    const preview = buildForm3Preview({
      facility: {
        name: 'Test RVSF',
        registrationNumber: 'REG-1',
        validity: '2030-01-01',
        authorisedCapacity: { L: 10, M: 100, N: 50, OTHER: 5 },
      },
      financialYearLabel: '2025-26',
      periodLabel: 'Financial Year',
      from: new Date('2025-04-01'),
      to: new Date('2026-03-31'),
      capacityRows: {
        L: { completed: 2, inProcess: 1 },
        M: { completed: 40, inProcess: 0 },
        N: { completed: 10, inProcess: 2 },
        OTHER: { completed: 0, inProcess: 0 },
      },
      inwardsByClass: { L: 100, M: 5000, N: 2000, OTHER: 0 },
      outwards: {
        FERROUS: 3000,
        ALUMINIUM: 200,
        COPPER: 50,
        PLASTICS: 100,
        GLASS: 80,
        TYRES: 120,
        PRECIOUS_METALS: 1,
        OTHERS: 49,
      },
      hazReprocess: {
        FUEL: 20,
        OILS: 30,
        GASES: 5,
        BATTERIES: 40,
        FLUIDS: 15,
      },
      hazLandfill: { RESIDUES_RETAINED: 10, LANDFILL: 80 },
      guards: {
        unmappedPartCount: 0,
        unmappedWeightKg: 0,
        missingGrossWeightCount: 0,
        vehicleCount: 52,
      },
    });

    expect(preview.capacity.treatment.find((r) => r.key === 'M')?.utilisationPct).toBe(
      '40.00',
    );
    expect(preview.massFlow.inwardsGrandTotal).toBe(7100);
    expect(preview.massFlow.outwardsSubTotal).toBe(3600);
    expect(preview.massFlow.hazReprocessSubTotal).toBe(110);
    expect(preview.massFlow.hazLandfillSubTotal).toBe(90);
    expect(preview.massFlow.grandTotalOut).toBe(3800);
    expect(preview.massFlow.massBalance).toBe(3300);
  });

  it('resolves FY range', () => {
    const range = resolveDateRange({ period: 'fy' });
    expect(range.periodLabel).toBe('Financial Year');
    expect(range.from.getMonth()).toBe(3);
    expect(range.to.getMonth()).toBe(2);
  });
});
