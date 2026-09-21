import { getLeadWizardProgress, getPendingWizardStep } from './lead-wizard.util';

describe('lead wizard progress', () => {
  it('starts at lead details when name is missing', () => {
    expect(getPendingWizardStep({ mobileNumber: '9876543210', location: 'Pune' })).toBe(
      0,
    );
  });

  it('treats rc plus vehicle sides as document 1', () => {
    const lead = {
      name: 'A',
      mobileNumber: '9876543210',
      location: 'Pune',
      registrationNumber: 'MH12AB1234',
      yearOfManufacture: 2020,
    };
    expect(getPendingWizardStep(lead, [{ documentType: 'rc' }])).toBe(3);
    expect(getPendingWizardStep(lead, [{ documentType: 'vehicleFront' }])).toBe(3);
  });

  it('lists completed steps before the next incomplete one', () => {
    const progress = getLeadWizardProgress({
      name: 'A',
      mobileNumber: '9876543210',
      location: 'Pune',
    });
    expect(progress.wizardNextStep).toBe(1);
    expect(progress.wizardCompleted).toEqual(['Lead Details']);
  });

  it('marks all steps complete when closed', () => {
    const progress = getLeadWizardProgress(
      {
        name: 'A',
        mobileNumber: '9876543210',
        location: 'Pune',
        registrationNumber: 'MH12AB1234',
        yearOfManufacture: 2020,
        offerAmount: 1,
        counterAmount: 1,
        aadhaarNumber: '1',
        status: 'CLOSED',
      },
      [{ documentType: 'rc' }, { documentType: 'aadhaar' }],
    );
    expect(progress.wizardCompleted).toHaveLength(7);
  });
});
