import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

const saltRounds = 10;

export function validatePasswordStrength(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new BadRequestException('Password is required');
  }

  if (password.length < 6) {
    throw new BadRequestException(
      'Password must be at least 6 characters long',
    );
  }

  if (password.length > 128) {
    throw new BadRequestException('Password must be less than 128 characters');
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException(
      'Password must contain at least one uppercase letter',
    );
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException(
      'Password must contain at least one lowercase letter',
    );
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('Password must contain at least one number');
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-={};':"\\|,.<>/?]/.test(password)) {
    throw new BadRequestException(
      'Password must contain at least one special character',
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
}
