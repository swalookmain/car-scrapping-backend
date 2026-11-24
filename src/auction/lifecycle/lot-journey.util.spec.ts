import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';
import {
  JourneyLotInput,
  deriveAuctionNextStep,
  deriveLotJourney,
  getYardReadiness,
} from './lot-journey.util';

const pendingLot = (): JourneyLotInput => ({
  outcomeStatus: LotOutcomeStatus.PENDING,
  payment: { paymentStatus: LotPaymentStatus.NOT_PAID },
});

const dealDoneUnpaid = (): JourneyLotInput => ({
  outcomeStatus: LotOutcomeStatus.DEAL_DONE,
  payment: { paymentStatus: LotPaymentStatus.NOT_PAID },
});

const paidLot = (): JourneyLotInput => ({
  outcomeStatus: LotOutcomeStatus.DEAL_DONE,
  payment: { paymentStatus: LotPaymentStatus.PAID },
});

const fullyDoneLot = (): JourneyLotInput => ({
  ...paidLot(),
  delivery: {
    finalApprovalForLifting: true,
    lastLiftingDate: new Date('2026-12-01'),
  },
  gatePass: { documentId: 'doc-1' },
});

const stateOf = (lot: JourneyLotInput, key: string) =>
  deriveLotJourney(lot).steps.find((s) => s.key === key)?.state;

describe('deriveLotJourney', () => {
  it('pending lot: only lot status is current, everything else is locked', () => {
    const journey = deriveLotJourney(pendingLot());
    expect(stateOf(pendingLot(), 'LOT_STATUS')).toBe('CURRENT');
    expect(stateOf(pendingLot(), 'PAYMENT')).toBe('LOCKED');
    expect(stateOf(pendingLot(), 'DELIVERY')).toBe('LOCKED');
    expect(stateOf(pendingLot(), 'GATE_PASS')).toBe('LOCKED');
    expect(journey.nextStep?.key).toBe('LOT_STATUS');
    expect(journey.readyForYard).toBe(false);
  });

  it('deal done unpaid: payment is current, delivery and gate pass explain why they are locked', () => {
    const journey = deriveLotJourney(dealDoneUnpaid());
    expect(stateOf(dealDoneUnpaid(), 'LOT_STATUS')).toBe('DONE');
    expect(stateOf(dealDoneUnpaid(), 'PAYMENT')).toBe('CURRENT');
    const delivery = journey.steps.find((s) => s.key === 'DELIVERY');
    expect(delivery?.state).toBe('LOCKED');
    expect(delivery?.lockedReason).toBe('Needs full payment');
    expect(journey.nextStep?.action).toBe('UPDATE_PAYMENT');
  });

  it('paid lot: delivery is current, gate pass is pending (available but not next)', () => {
    expect(stateOf(paidLot(), 'PAYMENT')).toBe('DONE');
    expect(stateOf(paidLot(), 'DELIVERY')).toBe('CURRENT');
    expect(stateOf(paidLot(), 'GATE_PASS')).toBe('PENDING');
  });

  it('RCM is optional: never the current step', () => {
    const journey = deriveLotJourney(dealDoneUnpaid());
    const rcm = journey.steps.find((s) => s.key === 'RCM');
    expect(rcm?.optional).toBe(true);
    expect(rcm?.state).toBe('PENDING');
    expect(journey.nextStep?.key).not.toBe('RCM');
  });

  it('paid + delivery done but no gate pass: gate pass is next and yard is blocked', () => {
    const lot: JourneyLotInput = {
      ...paidLot(),
      delivery: {
        finalApprovalForLifting: true,
        lastLiftingDate: new Date('2026-12-01'),
      },
    };
    const journey = deriveLotJourney(lot);
    expect(journey.nextStep?.key).toBe('GATE_PASS');
    expect(journey.readyForYard).toBe(false);
    expect(journey.yardBlockedReason).toMatch(/gate pass/i);
  });

  it('everything done: ready for yard hand-off', () => {
    const journey = deriveLotJourney(fullyDoneLot());
    expect(journey.nextStep?.key).toBe('READY_FOR_YARD');
    expect(journey.nextStep?.action).toBeNull();
    expect(journey.readyForYard).toBe(true);
    expect(journey.yardBlockedReason).toBeUndefined();
  });

  it('rejected or left lot is closed with nothing to do', () => {
    const lot: JourneyLotInput = { outcomeStatus: LotOutcomeStatus.REJECTED };
    const journey = deriveLotJourney(lot);
    expect(journey.closed).toBe(true);
    expect(journey.nextStep).toBeNull();
    expect(stateOf(lot, 'PAYMENT')).toBe('NOT_APPLICABLE');
  });
});

describe('getYardReadiness', () => {
  it('blocks lots that are not deal done', () => {
    expect(getYardReadiness(pendingLot())).toEqual({
      ready: false,
      blockedReason: 'Lot must be marked Deal Done first',
    });
  });

  it('blocks unpaid lots', () => {
    const result = getYardReadiness(dealDoneUnpaid());
    expect(result.ready).toBe(false);
    expect(result.blockedReason).toMatch(/fully paid/i);
  });

  it('blocks paid lots without a gate pass file', () => {
    const result = getYardReadiness(paidLot());
    expect(result.ready).toBe(false);
    expect(result.blockedReason).toMatch(/gate pass/i);
  });

  it('allows paid lots with a gate pass file', () => {
    expect(
      getYardReadiness({ ...paidLot(), gatePass: { documentId: 'doc-1' } }),
    ).toEqual({ ready: true });
  });
});

describe('deriveAuctionNextStep', () => {
  it('cancelled auction', () => {
    expect(deriveAuctionNextStep([paidLot()], true).key).toBe('CANCELLED');
  });

  it('no lots yet', () => {
    expect(deriveAuctionNextStep([]).key).toBe('ADD_LOTS');
  });

  it('all lots rejected or left is closed', () => {
    const result = deriveAuctionNextStep([
      { outcomeStatus: LotOutcomeStatus.REJECTED },
      { outcomeStatus: LotOutcomeStatus.LEFT },
    ]);
    expect(result.key).toBe('CLOSED');
  });

  it('mixed lots: the least advanced open lot decides, with a count', () => {
    const result = deriveAuctionNextStep([
      paidLot(),
      dealDoneUnpaid(),
      dealDoneUnpaid(),
      { outcomeStatus: LotOutcomeStatus.REJECTED },
    ]);
    expect(result.key).toBe('PAYMENT');
    expect(result.lotCount).toBe(2);
    expect(result.openLotCount).toBe(3);
  });

  it('returns the id of the first lot waiting on the next step', () => {
    const result = deriveAuctionNextStep([
      { ...paidLot(), _id: 'lot-a' },
      { ...dealDoneUnpaid(), _id: 'lot-b' },
      { ...dealDoneUnpaid(), _id: 'lot-c' },
    ]);
    expect(result.key).toBe('PAYMENT');
    expect(result.lotId).toBe('lot-b');
  });

  it('one paid lot does not unlock delivery for an unpaid sibling', () => {
    const result = deriveAuctionNextStep([paidLot(), pendingLot()]);
    expect(result.key).toBe('LOT_STATUS');
  });

  it('all lots ready for yard', () => {
    const result = deriveAuctionNextStep([fullyDoneLot(), fullyDoneLot()]);
    expect(result.key).toBe('READY_FOR_YARD');
    expect(result.lotCount).toBe(2);
  });
});
