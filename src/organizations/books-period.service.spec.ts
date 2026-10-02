import { BadRequestException } from '@nestjs/common';
import { BooksPeriodService } from './books-period.service';
import { toBusinessDateKey } from './books-period.util';

describe('BooksPeriodService', () => {
  const repo = {
    findByOrganizationId: jest.fn(),
    upsertByOrganizationId: jest.fn(),
  };
  const service = new BooksPeriodService(repo as never);
  const orgId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows any date when the organization has no books settings', async () => {
    repo.findByOrganizationId.mockResolvedValue(null);
    await expect(service.assertOpen(orgId, '2019-01-01', 'Purchase date')).resolves.toBeUndefined();
    await expect(service.assertOpen(orgId, '2099-01-01', 'Purchase date')).resolves.toBeUndefined();
  });

  it('rejects dates before the books start date and dates after today', async () => {
    repo.findByOrganizationId.mockResolvedValue({
      booksStartDate: new Date('2024-04-01T00:00:00.000Z'),
    });
    await expect(service.assertOpen(orgId, '2024-03-31', 'Purchase date')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.assertOpen(orgId, '2099-01-01', 'Purchase date')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.assertOpen(orgId, '2024-04-01', 'Purchase date')).resolves.toBeUndefined();
  });

  it('allows a future deadline inside an open window', async () => {
    repo.findByOrganizationId.mockResolvedValue({
      booksStartDate: new Date('2024-04-01T00:00:00.000Z'),
    });
    await expect(
      service.assertOpen(orgId, '2099-06-01', 'Last lifting date', { allowFuture: true }),
    ).resolves.toBeUndefined();
  });

  it('keeps a date-only value on the same calendar day', () => {
    expect(toBusinessDateKey('2024-04-01')).toBe('2024-04-01');
  });
});
