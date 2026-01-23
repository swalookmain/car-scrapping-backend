import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { comparePasswords } from '../common/utils/password.util';
import { Role } from '../common/enum/role.enum';
import { ConfigService } from '@nestjs/config';
import { isValidEmail } from '../common/utils/security.util';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthRepository } from './auth.repository';
import { RequestMetadata } from './utils/metadata.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authRepository: AuthRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async login(email: string, password: string, metadata?: RequestMetadata) {
    try {
      this.logger.log(`Login attempt for email: ${email}`, 'AuthService');

      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      if (!isValidEmail(email)) {
        this.logger.warn(
          `Invalid email format attempted: ${email}`,
          'AuthService',
        );
        throw new BadRequestException('Invalid email format');
      }

      // Don't sanitize email - it's already validated and sanitization removes dots
      const sanitizedEmail = email.toLowerCase().trim();

      let user = await this.usersService.getByEmailwithPassword(sanitizedEmail);
      if (!user) {
        // Backward compatibility for legacy dot-stripped emails
        const legacyEmail = sanitizedEmail.replace(/\./g, '');
        if (legacyEmail !== sanitizedEmail) {
          user = await this.usersService.getByEmailwithPassword(legacyEmail);
          if (user) {
            this.logger.warn(
              `Login matched legacy dot-stripped email: ${legacyEmail}`,
              'AuthService',
            );
          }
        }
      }
      console.log('user', user);
      if (!user) {
        this.logger.warn(
          `Failed login attempt: user not found for ${sanitizedEmail}`,
          'AuthService',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (user.isActive === false) {
        this.logger.warn(
          `Login attempt for deactivated account: ${sanitizedEmail}`,
          'AuthService',
        );
        throw new ForbiddenException('Account is deactivated');
      }

      const isMatch = await comparePasswords(password, user.password);
      if (!isMatch) {
        this.logger.warn(
          `Failed login attempt: invalid password for ${sanitizedEmail}`,
          'AuthService',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.role !== Role.SUPER_ADMIN && !user.organizationId) {
        throw new ForbiddenException('User not assigned to organization');
      }

      const payload: JwtPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        orgId: user.organizationId?.toString() || null,
        name: user.name,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.access.secret'),
        expiresIn: this.config.get('jwt.access.expiresIn'),
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.refresh.secret'),
        expiresIn: this.config.get('jwt.refresh.expiresIn'),
      });

      // Calculate expiration date
      const refreshExpiresIn =
        this.config.get<string>('jwt.refresh.expiresIn') || '2d';
      const expiresAt = this.calculateExpirationDate(refreshExpiresIn);

      // Store refresh token with metadata in database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.authRepository.createRefreshToken(
        user._id.toString(),
        refreshToken,
        metadata || {},
        expiresAt,
      );

      this.logger.log(
        `Successful login for user: ${user.email} (${user.role})`,
        'AuthService',
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          role: user.role,
          orgId: user.organizationId,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refreshToken(refreshToken: string, metadata?: RequestMetadata) {
    try {
      this.logger.log('Refresh token request received', 'AuthService');

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new BadRequestException('Refresh token is required');
      }

      const decoded = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('jwt.refresh.secret'),
      });

      if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
        this.logger.warn(
          'Invalid refresh token: failed to decode',
          'AuthService',
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token exists in database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const storedToken =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.authRepository.findRefreshToken(refreshToken);
      if (!storedToken) {
        this.logger.warn('Refresh token not found in database', 'AuthService');
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.getById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if user is active
      if (user.isActive === false) {
        throw new ForbiddenException('Account is deactivated');
      }

      const payload: JwtPayload = {
        sub: decoded.sub,
        email: user.email,
        role: user.role,
        orgId: user.organizationId?.toString() || null,
        name: user.name,
      };

      const newAccessToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.access.secret'),
        expiresIn: this.config.get('jwt.access.expiresIn'),
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.refresh.secret'),
        expiresIn: this.config.get('jwt.refresh.expiresIn'),
      });

      // Calculate expiration date
      const refreshExpiresIn =
        this.config.get<string>('jwt.refresh.expiresIn') || '2d';
      const expiresAt = this.calculateExpirationDate(refreshExpiresIn);

      // Update refresh token with new token and metadata
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.authRepository.updateRefreshToken(
        refreshToken,
        newRefreshToken,
        metadata || {},
        expiresAt,
      );

      this.logger.log(
        `Token refreshed successfully for user: ${user.email}`,
        'AuthService',
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      this.logger.log('Logout request received', 'AuthService');

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new BadRequestException('Refresh token is required');
      }

      // Remove refresh token from database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const deleted =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.authRepository.deleteRefreshToken(refreshToken);

      if (!deleted) {
        this.logger.warn(
          'Refresh token not found during logout',
          'AuthService',
        );
        // Don't throw error, just log - token might already be deleted
      } else {
        this.logger.log('Refresh token removed successfully', 'AuthService');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error during logout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuthService',
      );
      // Don't throw error on logout failure to prevent user from being stuck
    }
  }

  private calculateExpirationDate(expiresIn: string): Date {
    // Parse expiresIn string (e.g., "2d", "7d", "30d", "3600s")
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 2 days if parsing fails
      const date = new Date();
      date.setDate(date.getDate() + 2);
      return date;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const date = new Date();
    switch (unit) {
      case 's':
        date.setSeconds(date.getSeconds() + value);
        break;
      case 'm':
        date.setMinutes(date.getMinutes() + value);
        break;
      case 'h':
        date.setHours(date.getHours() + value);
        break;
      case 'd':
        date.setDate(date.getDate() + value);
        break;
      default:
        date.setDate(date.getDate() + 2);
    }

    return date;
  }
}
