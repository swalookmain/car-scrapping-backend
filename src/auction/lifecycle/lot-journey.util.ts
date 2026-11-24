import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';

/**
 * Single source of truth for "what must be done next" on an auction lot.
 * Pure functions (no DI) so Auction, Lifecycle and Yard modules can share them.
 */

export type JourneyStepKey =
  | 'LOT_STATUS'
  | 'PAYMENT'
  | 'DELIVERY'
  | 'GATE_PASS'
  | 'RCM';

/**
 * DONE           step completed
 * CURRENT        the next step the user should do
 * PENDING        can be done now, but is not the next required step
 * LOCKED         cannot be done yet (see lockedReason)
 * NOT_APPLICABLE lot is closed (rejected / left), nothing to do
 */
export type JourneyStepState =
  | 'DONE'
  | 'CURRENT'
  | 'PENDING'
  | 'LOCKED'
  | 'NOT_APPLICABLE';

/** Same strings as LIFECYCLE_ACTIONS so the UI can open the matching modal */
export type JourneyActionKey =
  | 'UPDATE_LOT_STATUS'
  | 'UPDATE_PAYMENT'
  | 'UPDATE_DELIVERY'
  | 'ADD_GATE_PASS'
  | 'ADD_RCM';

export interface JourneyStep {
  key: JourneyStepKey;
  label: string;
  action: JourneyActionKey;
  state: JourneyStepState;
  optional: boolean;
  lockedReason?: string;
}

export type JourneyNextStepKey = JourneyStepKey | 'READY_FOR_YARD';

export interface JourneyNextStep {
  key: JourneyNextStepKey;
  label: string;
  /** Lifecycle modal action to open; null for hand-off steps outside the auction screen */
  action: JourneyActionKey | null;
}

export interface LotJourney {
  steps: JourneyStep[];
  nextStep: JourneyNextStep | null;
  closed: boolean;
  readyForYard: boolean;
  yardBlockedReason?: string;
}

/** Minimal lot shape so the helpers work with documents, plain objects and tests */
export interface JourneyLotInput {
  _id?: { toString(): string } | string | null;
  outcomeStatus?: LotOutcomeStatus | string;
  payment?: { paymentStatus?: LotPaymentStatus | string } | null;
  delivery?: {
    finalApprovalForLifting?: boolean;
    lastLiftingDate?: Date | string | null;
  } | null;
  gatePass?: { documentId?: unknown } | null;
  rcm?: {
    challanNumber?: string;
    transactionDate?: Date | string | null;
    amount?: number | null;
  } | null;
}

export interface AuctionNextStep {
  key: JourneyNextStepKey | 'ADD_LOTS' | 'CLOSED' | 'CANCELLED';
  label: string;
  action: JourneyActionKey | null;
  /** First lot waiting on this step, so the UI can open that lot directly */
  lotId?: string;
  /** Lots currently waiting on this step */
  lotCount: number;
  /** Lots that are still open (not rejected / left) */
  openLotCount: number;
}

const STEP_ORDER: JourneyStepKey[] = [
  'LOT_STATUS',
  'PAYMENT',
  'DELIVERY',
  'GATE_PASS',
  'RCM',
];

const STEP_META: Record<
  JourneyStepKey,
  { label: string; action: JourneyActionKey; optional: boolean }
> = {
  LOT_STATUS: {
    label: 'Update lot status',
    action: 'UPDATE_LOT_STATUS',
    optional: false,
  },
  PAYMENT: { label: 'Record payment', action: 'UPDATE_PAYMENT', optional: false },
  DELIVERY: {
    label: 'Delivery details',
    action: 'UPDATE_DELIVERY',
    optional: false,
  },
  GATE_PASS: { label: 'Gate pass', action: 'ADD_GATE_PASS', optional: false },
  RCM: { label: 'RCM detail', action: 'ADD_RCM', optional: true },
};

const READY_FOR_YARD_NEXT: JourneyNextStep = {
  key: 'READY_FOR_YARD',
  label: 'Ready to park in yard',
  action: null,
};

export function isLotClosed(lot: JourneyLotInput): boolean {
  return (
    lot.outcomeStatus === LotOutcomeStatus.REJECTED ||
    lot.outcomeStatus === LotOutcomeStatus.LEFT
  );
}

export function isLotPaid(lot: JourneyLotInput): boolean {
  return lot.payment?.paymentStatus === LotPaymentStatus.PAID;
}

export function hasGatePass(lot: JourneyLotInput): boolean {
  return Boolean(lot.gatePass?.documentId);
}

function isDeliveryComplete(lot: JourneyLotInput): boolean {
  return (
    lot.delivery?.finalApprovalForLifting === true &&
    Boolean(lot.delivery?.lastLiftingDate)
  );
}

function hasRcm(lot: JourneyLotInput): boolean {
  const rcm = lot.rcm;
  if (!rcm) return false;
  return Boolean(
    rcm.challanNumber ||
      rcm.transactionDate ||
      (typeof rcm.amount === 'number' && rcm.amount > 0),
  );
}

/**
 * Yard parking rule: a lot's vehicles may only be parked when the lot is
 * Deal Done, fully paid, and a gate pass file has been uploaded.
 */
export function getYardReadiness(lot: JourneyLotInput): {
  ready: boolean;
  blockedReason?: string;
} {
  if (lot.outcomeStatus !== LotOutcomeStatus.DEAL_DONE) {
    return { ready: false, blockedReason: 'Lot must be marked Deal Done first' };
  }
  if (!isLotPaid(lot)) {
    return {
      ready: false,
      blockedReason: 'Lot must be fully paid before parking in yard',
    };
  }
  if (!hasGatePass(lot)) {
    return {
      ready: false,
      blockedReason: 'Upload the gate pass before parking in yard',
    };
  }
  return { ready: true };
}

export function deriveLotJourney(lot: JourneyLotInput): LotJourney {
  const closed = isLotClosed(lot);
  const dealDone = lot.outcomeStatus === LotOutcomeStatus.DEAL_DONE;
  const paid = isLotPaid(lot);
  const yard = getYardReadiness(lot);

  const done: Record<JourneyStepKey, boolean> = {
    LOT_STATUS: dealDone || closed,
    PAYMENT: dealDone && paid,
    DELIVERY: paid && isDeliveryComplete(lot),
    GATE_PASS: paid && hasGatePass(lot),
    RCM: dealDone && hasRcm(lot),
  };

  const lockedReason = (key: JourneyStepKey): string | undefined => {
    switch (key) {
      case 'PAYMENT':
        return dealDone ? undefined : 'Mark the lot as Deal Done first';
      case 'DELIVERY':
        if (!dealDone) return 'Mark the lot as Deal Done first';
        return paid ? undefined : 'Needs full payment';
      case 'GATE_PASS':
        if (!dealDone) return 'Mark the lot as Deal Done first';
        return paid ? undefined : 'Needs full payment';
      case 'RCM':
        return dealDone ? undefined : 'Mark the lot as Deal Done first';
      default:
        return undefined;
    }
  };

  let currentAssigned = false;
  const steps: JourneyStep[] = STEP_ORDER.map((key) => {
    const meta = STEP_META[key];
    const base = {
      key,
      label: meta.label,
      action: meta.action,
      optional: meta.optional,
    };

    if (closed && key !== 'LOT_STATUS') {
      return {
        ...base,
        state: 'NOT_APPLICABLE' as const,
        lockedReason: `Lot is ${String(lot.outcomeStatus).toLowerCase()}`,
      };
    }
    if (done[key]) return { ...base, state: 'DONE' as const };

    const reason = lockedReason(key);
    if (reason) return { ...base, state: 'LOCKED' as const, lockedReason: reason };

    // Available to do now. Optional steps never become the "current" step.
    if (!meta.optional && !currentAssigned) {
      currentAssigned = true;
      return { ...base, state: 'CURRENT' as const };
    }
    return { ...base, state: 'PENDING' as const };
  });

  let nextStep: JourneyNextStep | null = null;
  if (!closed) {
    const current = steps.find((s) => s.state === 'CURRENT');
    if (current) {
      nextStep = {
        key: current.key,
        label: current.label,
        action: current.action,
      };
    } else if (yard.ready) {
      nextStep = READY_FOR_YARD_NEXT;
    }
  }

  return {
    steps,
    nextStep,
    closed,
    readyForYard: yard.ready,
    yardBlockedReason: yard.ready ? undefined : yard.blockedReason,
  };
}

/**
 * Auction-level next step: the least-advanced open lot decides what the
 * auction row says, with a count of how many lots are waiting on it.
 */
export function deriveAuctionNextStep(
  lots: JourneyLotInput[],
  auctionCancelled = false,
): AuctionNextStep {
  if (auctionCancelled) {
    return {
      key: 'CANCELLED',
      label: 'Cancelled',
      action: null,
      lotCount: 0,
      openLotCount: 0,
    };
  }
  if (!lots.length) {
    return {
      key: 'ADD_LOTS',
      label: 'Add lots and vehicles',
      action: null,
      lotCount: 0,
      openLotCount: 0,
    };
  }

  const open = lots
    .map((lot) => ({ lot, ...deriveLotJourney(lot) }))
    .filter((journey) => !journey.closed);

  if (!open.length) {
    return {
      key: 'CLOSED',
      label: 'Closed',
      action: null,
      lotCount: 0,
      openLotCount: 0,
    };
  }

  const rank = (journey: LotJourney) => {
    if (!journey.nextStep) return STEP_ORDER.length + 1;
    if (journey.nextStep.key === 'READY_FOR_YARD') return STEP_ORDER.length;
    return STEP_ORDER.indexOf(journey.nextStep.key);
  };

  const lowest = Math.min(...open.map(rank));
  const atLowest = open.filter((journey) => rank(journey) === lowest);
  const next = atLowest[0].nextStep;
  const lotId = atLowest[0].lot._id?.toString();

  if (!next) {
    return {
      key: 'READY_FOR_YARD',
      label: READY_FOR_YARD_NEXT.label,
      action: null,
      lotId,
      lotCount: atLowest.length,
      openLotCount: open.length,
    };
  }

  return {
    key: next.key,
    label: next.label,
    action: next.action,
    lotId,
    lotCount: atLowest.length,
    openLotCount: open.length,
  };
}
