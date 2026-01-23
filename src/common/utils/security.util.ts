import { BadRequestException } from '@nestjs/common';

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function validateObjectId(id: string, fieldName: string = 'ID'): string {
  if (!id || typeof id !== 'string') {
    throw new BadRequestException(`Invalid ${fieldName}: must be a string`);
  }
  if (!isValidObjectId(id)) {
    throw new BadRequestException(`Invalid ${fieldName} format`);
  }
  return id.trim();
}

/**
 * Sanitizes string input to prevent NoSQL injection
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove MongoDB operators from values, keep dots intact
  return input.replace(/\$/g, '').trim().substring(0, 1000);
}

/**
 * Sanitizes object to prevent NoSQL injection
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const sanitized: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip MongoDB operators
      if (key.startsWith('$')) {
        continue;
      }
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sanitized[key] = sanitizeObject(value) as T[Extract<keyof T, string>];
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
