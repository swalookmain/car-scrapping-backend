export const LEAD_WIZARD_STEP_LABELS = [
  'Lead Details',
  'Vehicle Details',
  'Document 1',
  'Offer',
  'KYC Details',
  'Documents',
  'Close deal',
] as const;

const VEHICLE_DOC_TYPES = new Set([
  'vehicleFront',
  'vehicleRight',
  'vehicleEngine',
  'vehicleLeft',
  'vehicleBack',
  'vehicleInterior',
  'rc',
]);

const KYC_DOC_TYPES = new Set(['aadhaar', 'pan', 'bankDetail']);

function normalizeRegistration(value?: string | null) {
  return (value || '').toUpperCase().replace(/[\s-]+/g, '');
}

export type LeadWizardSource = {
  name?: string;
  mobileNumber?: string;
  location?: string;
  registrationNumber?: string;
  yearOfManufacture?: number | string | null;
  offerAmount?: number | string | null;
  counterAmount?: number | string | null;
  aadhaarNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  status?: string;
};

export function getPendingWizardStep(
  lead: LeadWizardSource,
  docs: Array<{ documentType?: string }> = [],
): number {
  const types = new Set(
    docs.map((doc) => doc.documentType).filter((type): type is string => Boolean(type)),
  );
  const stepOneDone = Boolean(
    lead.name?.trim() &&
      /^\d{10}$/.test(lead.mobileNumber || '') &&
      lead.location?.trim(),
  );
  if (!stepOneDone) return 0;
  const registration = normalizeRegistration(lead.registrationNumber);
  const stepTwoDone = Boolean(
    registration &&
      /^[A-Za-z0-9]+$/.test(registration) &&
      lead.yearOfManufacture != null &&
      lead.yearOfManufacture !== '',
  );
  if (!stepTwoDone) return 1;
  if (![...types].some((type) => VEHICLE_DOC_TYPES.has(type))) return 2;
  const offerDone =
    lead.offerAmount !== '' &&
    lead.offerAmount != null &&
    lead.counterAmount !== '' &&
    lead.counterAmount != null;
  if (!offerDone) return 3;
  const kycDone = Boolean(
    lead.aadhaarNumber?.trim() ||
      lead.panNumber?.trim() ||
      lead.bankAccountNumber?.trim(),
  );
  if (!kycDone) return 4;
  if (![...types].some((type) => KYC_DOC_TYPES.has(type))) return 5;
  return 6;
}

export function getLeadWizardProgress(
  lead: LeadWizardSource,
  docs: Array<{ documentType?: string }> = [],
) {
  const wizardNextStep = getPendingWizardStep(lead, docs);
  const terminal = lead.status === 'CLOSED' || lead.status === 'CANCELLED';
  const wizardCompleted = terminal
    ? [...LEAD_WIZARD_STEP_LABELS]
    : LEAD_WIZARD_STEP_LABELS.slice(0, wizardNextStep);
  return { wizardNextStep, wizardCompleted };
}
