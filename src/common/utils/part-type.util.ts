import { PartType } from 'src/common/enum/partType.enum';

export function normalizePartType(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return 'other';
  return value.trim().toLowerCase();
}

export function formatPartTypeLabel(slug: string | undefined | null): string {
  const normalized = normalizePartType(slug);
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export const SYSTEM_PART_TYPE_SLUGS = Object.values(PartType).map((v) =>
  v.toLowerCase(),
);
