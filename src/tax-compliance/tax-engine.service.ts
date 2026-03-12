import { Injectable } from '@nestjs/common';

export interface TaxComputationInput {
  taxableAmount: number;
  gstApplicable: boolean;
  gstRate: number;
  reverseChargeApplicable: boolean;
  orgStateCode: string;
  placeOfSupplyState: string;
}

export interface TaxComputationResult {
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  isInterstate: boolean;
}

@Injectable()
export class TaxEngineService {
  compute(input: TaxComputationInput): TaxComputationResult {
    const taxableAmount = this.round2(input.taxableAmount);
    if (!input.gstApplicable) {
      return {
        taxableAmount,
        gstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
        totalAmount: taxableAmount,
        isInterstate: this.isInterstate(input.orgStateCode, input.placeOfSupplyState),
      };
    }

    const isInterstate = this.isInterstate(
      input.orgStateCode,
      input.placeOfSupplyState,
    );
    const normalizedRate = this.round4(input.gstRate);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterstate) {
      igstAmount = this.round2((taxableAmount * normalizedRate) / 100);
    } else {
      cgstAmount = this.round2((taxableAmount * normalizedRate) / 200);
      sgstAmount = this.round2((taxableAmount * normalizedRate) / 200);
    }

    const totalTaxAmount = this.round2(cgstAmount + sgstAmount + igstAmount);
    const totalAmount = input.reverseChargeApplicable
      ? taxableAmount
      : this.round2(taxableAmount + totalTaxAmount);

    return {
      taxableAmount,
      gstRate: normalizedRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTaxAmount,
      totalAmount,
      isInterstate,
    };
  }

  private isInterstate(orgStateCode: string, placeOfSupplyState: string) {
    return orgStateCode.trim().toUpperCase() !== placeOfSupplyState.trim().toUpperCase();
  }

  private round2(value: number) {
    return Number(value.toFixed(2));
  }

  private round4(value: number) {
    return Number(value.toFixed(4));
  }
}
