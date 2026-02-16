import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UsersRepository } from './users.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { hashPassword } from 'src/common/utils/password.util';
import { PaginatedResponse } from 'src/common/interface/paginated-response.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import {
  validateObjectId,
  sanitizeObject,
  isValidEmail,
} from 'src/common/utils/security.util';
import { Role } from 'src/common/enum/role.enum';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UsersRepository,
    private readonly organizationsService: OrganizationsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createAdmin(userData: Partial<any>) {
    try {
      this.logger.log(`Creating admin user: ${userData.email}`, 'UsersService');

      if (
        !userData.email ||
        typeof userData.email !== 'string' ||
        !isValidEmail(userData.email)
      ) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate organizationId is provided for ADMIN
      if (
        !userData.organizationId ||
        typeof userData.organizationId !== 'string'
      ) {
        throw new BadRequestException(
          'Organization ID is required for admin users',
        );
      }

      // Validate and check if organization exists
      const validatedOrgId = validateObjectId(
        userData.organizationId,
        'Organization ID',
      );
      try {
        await this.organizationsService.getById(validatedOrgId);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new NotFoundException('Organization not found');
        }
        throw error;
      }

      const sanitizedData = sanitizeObject(userData);

      // Check if user with this email already exists (handle legacy dotless)
      const email = sanitizedData.email as string;
      let existingUser = await this.userRepo.findByEmail(email);
      if (!existingUser) {
        const legacyEmail = email.replace(/\./g, '');
        if (legacyEmail !== email) {
          existingUser = await this.userRepo.findByEmail(legacyEmail);
        }
      }
      if (existingUser) {
        this.logger.warn(
          `Attempt to create duplicate admin: ${email}`,
          'UsersService',
        );
        throw new ConflictException('User with this email already exists');
      }

      if (!userData.password || typeof userData.password !== 'string') {
        throw new BadRequestException('Password is required');
      }

      const passwordHash = await hashPassword(userData.password);
      sanitizedData.password = passwordHash;
      sanitizedData.role = Role.ADMIN;
      sanitizedData.organizationId = validatedOrgId;

      const user = await this.userRepo.create(sanitizedData);
      const userObj = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...userWithoutSensitive } = userObj;

      this.logger.log(
        `Admin user created successfully: ${user.email} (${user._id.toString()}) for organization: ${validatedOrgId}`,
        'UsersService',
      );

      return userWithoutSensitive;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create admin user: ${errorMessage}`,
        errorStack,
        'UsersService',
      );
      throw new BadRequestException('Failed to create admin user');
    }
  }

  async createStaff(
    userData: Partial<any>,
    authenticatedUser: AuthenticatedUser,
  ) {
    try {
      this.logger.log(`Creating staff user: ${userData.email}`, 'UsersService');

      if (
        !userData.email ||
        typeof userData.email !== 'string' ||
        !isValidEmail(userData.email)
      ) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate that authenticated user is an admin with organization
      if (authenticatedUser.role !== Role.ADMIN) {
        throw new BadRequestException('Only admins can create staff users');
      }

      if (!authenticatedUser.orgId) {
        throw new BadRequestException(
          'Admin user must be assigned to an organization',
        );
      }

      const sanitizedData = sanitizeObject(userData);

      // Check if user with this email already exists (handle legacy dotless)
      const email = sanitizedData.email as string;
      let existingUser = await this.userRepo.findByEmail(email);
      if (!existingUser) {
        const legacyEmail = email.replace(/\./g, '');
        if (legacyEmail !== email) {
          existingUser = await this.userRepo.findByEmail(legacyEmail);
        }
      }
      if (existingUser) {
        this.logger.warn(
          `Attempt to create duplicate staff: ${email}`,
          'UsersService',
        );
        throw new ConflictException('User with this email already exists');
      }

      if (!userData.password || typeof userData.password !== 'string') {
        throw new BadRequestException('Password is required');
      }

      const passwordHash = await hashPassword(userData.password);
      sanitizedData.password = passwordHash;
      sanitizedData.role = Role.STAFF;
      // Automatically assign admin's organization to staff
      sanitizedData.organizationId = validateObjectId(
        authenticatedUser.orgId,
        'Organization ID',
      );

      const user = await this.userRepo.create(sanitizedData);
      const userObj = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...userWithoutSensitive } = userObj;

      this.logger.log(
        `Staff user created successfully: ${user.email} (${user._id.toString()}) for organization: ${authenticatedUser.orgId}`,
        'UsersService',
      );

      return userWithoutSensitive;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create staff user: ${errorMessage}`,
        errorStack,
        'UsersService',
      );
      throw new BadRequestException('Failed to create staff user');
    }
  }
  async findAllUser(
    organizationId?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<any> | any[]> {
    const filter: Record<string, unknown> = {
      role: Role.ADMIN,
    };

    if (organizationId) {
      const validatedOrgId = validateObjectId(
        organizationId,
        'Organization ID',
      );
      filter.organizationId = new Types.ObjectId(validatedOrgId);
    }

    if (page !== undefined && limit !== undefined) {
      const { page: safePage, limit: safeLimit } = getPagination(page, limit);
      const { data, total } = await this.userRepo.findPaginated(
        filter,
        safePage,
        safeLimit,
      );
      const totalPages = Math.ceil(total / safeLimit);

      const sanitizedData = data.map((user) => {
        const userObj = user.toObject ? user.toObject() : user;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, ...sanitized } = userObj;
        return sanitized;
      });

      return {
        data: sanitizedData,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      };
    }
    const users = await this.userRepo.findAllByFilter(filter);
    return users.map((user) => {
      const userObj = user.toObject ? user.toObject() : user;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...sanitized } = userObj;
      return sanitized;
    });
  }

  async getByEmailwithPassword(email: string) {
    return this.userRepo.findByEmail(email);
  }

  async getByIdWithRefreshToken(id: string) {
    const validatedId = validateObjectId(id, 'User ID');
    return this.userRepo.findByIdWithRefreshToken(validatedId);
  }

  async getById(id: string) {
    const validatedId = validateObjectId(id, 'User ID');
    const user = await this.userRepo.findById(validatedId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userObj = user.toObject ? user.toObject() : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...sanitized } = userObj;
    return sanitized;
  }
  async update(id: string, updateData: Partial<any>) {
    const validatedId = validateObjectId(id, 'User ID');
    if (updateData.password) {
      throw new BadRequestException(
        'Password cannot be updated through this endpoint',
      );
    }
    const sanitizedData = sanitizeObject(updateData);
    const user = await this.userRepo.update(validatedId, sanitizedData);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userObj = user.toObject ? user.toObject() : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...sanitized } = userObj;
    return sanitized;
  }
  async remove(id: string) {
    const validatedId = validateObjectId(id, 'User ID');
    const user = await this.userRepo.delete(validatedId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  async updateRefreshToken(id: string, refreshToken: string) {
    const validatedId = validateObjectId(id, 'User ID');
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BadRequestException('Invalid refresh token');
    }
    return this.userRepo.updateRefreshToken(validatedId, refreshToken);
  }

  async findAllStaffByOrganization(
    organizationId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<any> | any[]> {
    const validatedOrgId = validateObjectId(organizationId, 'Organization ID');

    if (page !== undefined && limit !== undefined) {
      const { page: safePage, limit: safeLimit } = getPagination(page, limit);
      const { data, total } = await this.userRepo.findPaginated(
        {
          organizationId: new Types.ObjectId(validatedOrgId),
          role: Role.STAFF,
        } as Record<string, any>,
        safePage,
        safeLimit,
      );
      const totalPages = Math.ceil(total / safeLimit);

      const sanitizedData = data.map((user) => {
        const userObj = user.toObject ? user.toObject() : user;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, ...sanitized } = userObj;
        return sanitized;
      });

      return {
        data: sanitizedData,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      };
    }

    const users =
      await this.userRepo.findAllStaffByOrganization(validatedOrgId);
    return users.map((user) => {
      const userObj = user.toObject ? user.toObject() : user;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...sanitized } = userObj;
      return sanitized;
    });
  }
}
