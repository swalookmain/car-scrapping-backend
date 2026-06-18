import { Injectable } from '@nestjs/common';
import { LotOutcomeStatus } from 'src/common/enum/lotOutcomeStatus.enum';
import { LotPaymentStatus } from 'src/common/enum/lotPaymentStatus.enum';
import { AuctionLotDocument } from '../auction-lot.schema';

export const LIFECYCLE_ACTIONS = {
  UPDATE_LOT_STATUS: 'UPDATE_LOT_STATUS',
  UPDATE_PAYMENT: 'UPDATE_PAYMENT',
  UPDATE_DELIVERY: 'UPDATE_DELIVERY',
  ADD_GATE_PASS: 'ADD_GATE_PASS',
  ADD_RCM: 'ADD_RCM',
} as const;

export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[keyof typeof LIFECYCLE_ACTIONS];

const OUTCOME_LABELS: Record<LotOutcomeStatus, string> = {
  [LotOutcomeStatus.PENDING]: 'Pending',
  [LotOutcomeStatus.DEAL_DONE]: 'Deal Done',
  [LotOutcomeStatus.STA]: 'STA',
  [LotOutcomeStatus.REJECTED]: 'Rejected',
  [LotOutcomeStatus.LEFT]: 'Left',
};

const EDITABLE_OUTCOMES = new Set([LotOutcomeStatus.PENDING, LotOutcomeStatus.STA]);

@Injectable()
export class LifecycleStateService {
  computeBalance(totalAmount: number, preEmdAmount: number): number {
    const balance = totalAmount - (preEmdAmount || 0);
    return Math.max(0, Math.round(balance * 100) / 100);
  }

  computePaymentStatus(
    balanceAmount: number,
    amountPaidTotal: number,
  ): { paymentStatus: LotPaymentStatus; amountLeft: number } {
    const amountLeft = Math.max(0, Math.round((balanceAmount - amountPaidTotal) * 100) / 100);
    let paymentStatus = LotPaymentStatus.NOT_PAID;
    if (amountLeft === 0 && amountPaidTotal > 0) {
      paymentStatus = LotPaymentStatus.PAID;
    } else if (amountPaidTotal > 0) {
      paymentStatus = LotPaymentStatus.PARTIALLY_PAID;
    }
    return { paymentStatus, amountLeft };
  }

  deriveAuctionSummary(lots: Array<{ outcomeStatus?: LotOutcomeStatus }>): string {
    const counts = new Map<LotOutcomeStatus, number>();
    for (const lot of lots) {
      const status = lot.outcomeStatus || LotOutcomeStatus.PENDING;
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const parts: string[] = [];
    for (const status of Object.values(LotOutcomeStatus)) {
      const count = counts.get(status);
      if (count && status !== LotOutcomeStatus.PENDING) {
        parts.push(`${count} ${OUTCOME_LABELS[status]}`);
      }
    }
    const pending = counts.get(LotOutcomeStatus.PENDING);
    if (pending) parts.push(`${pending} Pending`);
    return parts.length ? parts.join(' · ') : 'Pending';
  }

  deriveAvailableActions(
    lots: AuctionLotDocument[],
    auctionCancelled: boolean,
  ): LifecycleAction[] {
    if (auctionCancelled) return [];
    const actions: LifecycleAction[] = [LIFECYCLE_ACTIONS.UPDATE_LOT_STATUS];
    const hasDealDone = lots.some((l) => l.outcomeStatus === LotOutcomeStatus.DEAL_DONE);
    const hasPaid = lots.some((l) => l.payment?.paymentStatus === LotPaymentStatus.PAID);
    if (hasDealDone) {
      actions.push(LIFECYCLE_ACTIONS.UPDATE_PAYMENT);
      actions.push(LIFECYCLE_ACTIONS.ADD_RCM);
    }
    if (hasPaid) {
      actions.push(LIFECYCLE_ACTIONS.UPDATE_DELIVERY);
      actions.push(LIFECYCLE_ACTIONS.ADD_GATE_PASS);
    }
    return actions;
  }

  isLotOutcomeEditable(outcomeStatus: LotOutcomeStatus): boolean {
    return EDITABLE_OUTCOMES.has(outcomeStatus);
  }

  defaultPaymentDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  assertFutureDate(dateStr: string, fieldName: string) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date <= today) {
      throw new Error(`${fieldName} must be a future date`);
    }
  }
}
