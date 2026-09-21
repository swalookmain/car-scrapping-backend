import { Types } from 'mongoose';
import { Role } from 'src/common/enum/role.enum';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

export function isStaffUser(user: AuthenticatedUser): boolean {
  return user.role === Role.STAFF;
}

export function staffObjectId(user: AuthenticatedUser): Types.ObjectId {
  return new Types.ObjectId(user.userId);
}

export function andMongoFilters(
  ...parts: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> {
  const defined = parts.filter((part): part is Record<string, unknown> => {
    return Boolean(part) && Object.keys(part as object).length > 0;
  });
  if (defined.length === 0) {
    return {};
  }
  if (defined.length === 1) {
    return defined[0];
  }
  return { $and: defined };
}

/** Leads the staff member created or was assigned. */
export function staffLeadOwnerFilter(
  user: AuthenticatedUser,
): Record<string, unknown> | null {
  if (!isStaffUser(user)) {
    return null;
  }
  const id = staffObjectId(user);
  return { $or: [{ createdBy: id }, { assignedTo: id }] };
}

/** Invoices the staff created, or invoices linked to their leads. */
export function staffInvoiceOwnerFilter(
  user: AuthenticatedUser,
  ownedLeadIds: Types.ObjectId[],
): Record<string, unknown> | null {
  if (!isStaffUser(user)) {
    return null;
  }
  const id = staffObjectId(user);
  const or: Record<string, unknown>[] = [{ createdBy: id }];
  if (ownedLeadIds.length > 0) {
    or.push({ leadId: { $in: ownedLeadIds } });
  }
  return { $or: or };
}

/** Lifting jobs assigned to the staff member. */
export function staffLiftingOwnerFilter(
  user: AuthenticatedUser,
): Record<string, unknown> | null {
  if (!isStaffUser(user)) {
    return null;
  }
  return { assignedTo: staffObjectId(user) };
}

/**
 * Yard / dismantle rows the staff created, tied to their lead, or tied to an
 * invoice they can already see.
 */
export function staffYardOwnerFilter(
  user: AuthenticatedUser,
  ownedLeadIds: Types.ObjectId[],
  accessibleInvoiceIds: Types.ObjectId[],
  liftingAssignedYardVehicleIds: Types.ObjectId[] = [],
): Record<string, unknown> | null {
  if (!isStaffUser(user)) {
    return null;
  }
  const id = staffObjectId(user);
  const or: Record<string, unknown>[] = [{ createdBy: id }];
  if (ownedLeadIds.length > 0) {
    or.push({ leadId: { $in: ownedLeadIds } });
  }
  if (accessibleInvoiceIds.length > 0) {
    or.push({ invoiceId: { $in: accessibleInvoiceIds } });
  }
  if (liftingAssignedYardVehicleIds.length > 0) {
    or.push({ _id: { $in: liftingAssignedYardVehicleIds } });
  }
  return { $or: or };
}

export function extractIdString(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
    return extractIdString((value as { _id?: unknown })._id);
  }
  if (typeof value === 'object' && 'toString' in (value as object)) {
    return String(value);
  }
  return '';
}

export function sameOrganization(
  resourceOrgId: unknown,
  userOrgId: string | null | undefined,
): boolean {
  if (!userOrgId || !resourceOrgId) {
    return false;
  }
  return extractIdString(resourceOrgId) === userOrgId;
}

export function staffOwnsLeadRecord(
  lead: { createdBy?: unknown; assignedTo?: unknown } | Record<string, unknown>,
  user: AuthenticatedUser,
): boolean {
  if (!isStaffUser(user)) {
    return true;
  }
  const uid = user.userId;
  return (
    extractIdString((lead as { createdBy?: unknown }).createdBy) === uid ||
    extractIdString((lead as { assignedTo?: unknown }).assignedTo) === uid
  );
}

export function staffOwnsInvoiceRecord(
  invoice: { createdBy?: unknown; leadId?: unknown },
  user: AuthenticatedUser,
  ownedLeadIdSet: Set<string>,
): boolean {
  if (!isStaffUser(user)) {
    return true;
  }
  if (extractIdString(invoice.createdBy) === user.userId) {
    return true;
  }
  const leadId = extractIdString(invoice.leadId);
  return Boolean(leadId) && ownedLeadIdSet.has(leadId);
}
