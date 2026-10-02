import { dateKeyToUtcDate, toBusinessDateKey } from 'src/organizations/books-period.util';

export interface UtcDateWindow {
  $gte?: Date;
  $lt?: Date;
}

/** Inclusive calendar days in UTC. The end date includes the whole day. */
export function utcDateWindow(fromDate?: string, toDate?: string): UtcDateWindow | null {
  if (!fromDate && !toDate) return null;
  const window: UtcDateWindow = {};
  if (fromDate) window.$gte = dateKeyToUtcDate(toBusinessDateKey(fromDate));
  if (toDate) {
    const end = dateKeyToUtcDate(toBusinessDateKey(toDate));
    end.setUTCDate(end.getUTCDate() + 1);
    window.$lt = end;
  }
  return window;
}

/**
 * Mongo match for a business date. When the field is missing, fallbackField is used.
 */
export function dateWindowFilter(
  field: string,
  fromDate?: string,
  toDate?: string,
  fallbackField?: string,
): Record<string, unknown> | null {
  const window = utcDateWindow(fromDate, toDate);
  if (!window) return null;
  if (!fallbackField) {
    return { [field]: window };
  }

  const value = { $ifNull: [`$${field}`, `$${fallbackField}`] };
  const checks: Record<string, unknown>[] = [];
  if (window.$gte) checks.push({ $gte: [value, window.$gte] });
  if (window.$lt) checks.push({ $lt: [value, window.$lt] });
  return { $expr: checks.length === 1 ? checks[0] : { $and: checks } };
}
