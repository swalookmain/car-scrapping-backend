import { Types } from 'mongoose';
import { Role } from 'src/common/enum/role.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import {
  andMongoFilters,
  isStaffUser,
  sameOrganization,
  staffInvoiceOwnerFilter,
  staffLeadOwnerFilter,
  staffOwnsInvoiceRecord,
  staffOwnsLeadRecord,
  staffLiftingOwnerFilter,
  staffYardOwnerFilter,
} from './data-scope';

const staff: AuthenticatedUser = {
  userId: new Types.ObjectId().toString(),
  role: Role.STAFF,
  orgId: new Types.ObjectId().toString(),
  email: 's@x.com',
  name: 'Staff',
  allowedModules: [],
};

const admin: AuthenticatedUser = {
  ...staff,
  userId: new Types.ObjectId().toString(),
  role: Role.ADMIN,
};

describe('data-scope', () => {
  it('treats only STAFF as scoped', () => {
    expect(isStaffUser(staff)).toBe(true);
    expect(isStaffUser(admin)).toBe(false);
  });

  it('does not add owner filters for admin', () => {
    expect(staffLeadOwnerFilter(admin)).toBeNull();
    expect(staffInvoiceOwnerFilter(admin, [])).toBeNull();
    expect(staffYardOwnerFilter(admin, [], [])).toBeNull();
  });

  it('scopes staff leads to created or assigned', () => {
    const filter = staffLeadOwnerFilter(staff);
    expect(filter).toMatchObject({
      $or: [
        { createdBy: expect.any(Types.ObjectId) },
        { assignedTo: expect.any(Types.ObjectId) },
      ],
    });
  });

  it('includes lead-linked invoices for staff', () => {
    const leadId = new Types.ObjectId();
    const filter = staffInvoiceOwnerFilter(staff, [leadId]);
    expect(JSON.stringify(filter)).toContain(leadId.toString());
  });

  it('merges conflicting $or clauses with $and', () => {
    const merged = andMongoFilters(
      { organizationId: 'org' },
      { $or: [{ name: 'a' }] },
      staffLeadOwnerFilter(staff),
    );
    expect(merged.$and).toHaveLength(3);
  });

  it('locks resources to the caller organization', () => {
    expect(sameOrganization(staff.orgId, staff.orgId)).toBe(true);
    expect(sameOrganization(new Types.ObjectId(), staff.orgId)).toBe(false);
    expect(sameOrganization(staff.orgId, null)).toBe(false);
  });

  it('lets staff see assigned or created leads', () => {
    expect(
      staffOwnsLeadRecord({ assignedTo: staff.userId }, staff),
    ).toBe(true);
    expect(
      staffOwnsLeadRecord({ createdBy: staff.userId }, staff),
    ).toBe(true);
    expect(
      staffOwnsLeadRecord({ assignedTo: new Types.ObjectId() }, staff),
    ).toBe(false);
  });

  it('lets staff see invoices they created or from owned leads', () => {
    const leadId = new Types.ObjectId().toString();
    expect(
      staffOwnsInvoiceRecord({ createdBy: staff.userId }, staff, new Set()),
    ).toBe(true);
    expect(
      staffOwnsInvoiceRecord({ leadId }, staff, new Set([leadId])),
    ).toBe(true);
    expect(
      staffOwnsInvoiceRecord({ leadId }, staff, new Set()),
    ).toBe(false);
  });

  it('includes lifting-assigned yard vehicles for staff', () => {
    const yardId = new Types.ObjectId();
    const filter = staffYardOwnerFilter(staff, [], [], [yardId]);
    expect(JSON.stringify(filter)).toContain(yardId.toString());
  });
});
