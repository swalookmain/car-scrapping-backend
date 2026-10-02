import { BadRequestException } from '@nestjs/common';

const IST = 'Asia/Kolkata';
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/;

export function toBusinessDateKey(value: Date | string): string {
  if (typeof value === 'string') {
    const match = value.match(DATE_KEY);
    if (match) {
      return assertRealDateKey(match[0]);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date');
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function assertRealDateKey(key: string): string {
  const match = key.match(DATE_KEY);
  if (!match) {
    throw new BadRequestException('Invalid date');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new BadRequestException('Invalid date');
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${assertRealDateKey(dateKey)}T00:00:00.000Z`);
}
