import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
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
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionCreatedBy } from '../subscription/enum/subscription-created-by.enum';
import { SubscriptionInputDto } from '../subscription/dto/subscription-input.dto';
import { AuthRepository } from '../auth/auth.repository';
import {
  listsEqual,
  sanitizeStaffModules,
} from 'src/common/access/app-modules';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UsersRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => AuthRepository))
    private readonly authRepository: AuthRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createSignupUser(userData: {
    name: string;
    email: string;
    password: string;
    organizationId: string;
  }) {
    const validatedOrgId = validateObjectId(
      userData.organizationId,
      'Organization ID',
    );

    const user = await this.userRepo.create({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      role: Role.ADMIN,
      organizationId: new Types.ObjectId(validatedOrgId),
      phoneNumber: '',
      emailVerified: false,
      isActive: true,
    });

    return user;
  }

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

      let validatedOrgId: string;

      if (userData.organizationId) {
        validatedOrgId = validateObjectId(
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
      } else if (userData.organizationName) {
        const org = await this.organizationsService.create({
          name: userData.organizationName,
          isActive: true,
        });
        validatedOrgId = org._id.toString();
      } else {
        throw new BadRequestException(
          'Organization ID or organization name is required for admin users',
        );
      }

      const subscriptionInput: SubscriptionInputDto =
        userData.subscription ||
        this.subscriptionService.defaultTrialInput();

      await this.subscriptionService.createOrUpdateForOrg(
        validatedOrgId,
        subscriptionInput,
        SubscriptionCreatedBy.SUPERADMIN,
      );

      const sanitizedData = sanitizeObject(userData);
      delete sanitizedData.organizationName;
      delete sanitizedData.subscription;

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
      sanitizedData.organizationId = new Types.ObjectId(validatedOrgId);
      if (!sanitizedData.phoneNumber) {
        sanitizedData.phoneNumber = '';
      }

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
      sanitizedData.allowedModules = sanitizeStaffModules(
        userData.allowedModules,
      );
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

  async getById(id: string, actor?: AuthenticatedUser) {
    const validatedId = validateObjectId(id, 'User ID');
    const user = await this.userRepo.findById(validatedId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.assertActorCanManageUser(user, actor);
    const userObj = user.toObject ? user.toObject() : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...sanitized } = userObj;
    return sanitized;
  }
  async update(id: string, updateData: Partial<any>, actor?: AuthenticatedUser) {
    const validatedId = validateObjectId(id, 'User ID');
    if (updateData.password) {
      throw new BadRequestException(
        'Password cannot be updated through this endpoint',
      );
    }
    const existing = await this.userRepo.findById(validatedId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    this.assertActorCanManageUser(existing, actor);

    const sanitizedData = sanitizeObject(updateData);
    let modulesChanged = false;

    if ('allowedModules' in sanitizedData) {
      if (existing.role !== Role.STAFF) {
        delete sanitizedData.allowedModules;
      } else {
        const next = sanitizeStaffModules(sanitizedData.allowedModules);
        const prev = sanitizeStaffModules(existing.allowedModules);
        sanitizedData.allowedModules = next;
        modulesChanged = !listsEqual(prev, next);
      }
    }

    const user = await this.userRepo.updateById(validatedId, sanitizedData);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (modulesChanged) {
      await this.authRepository.deleteRefreshTokenByUserId(validatedId);
    }

    const userObj = user.toObject ? user.toObject() : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...sanitized } = userObj;
    return sanitized;
  }
  async remove(id: string) {
    const validatedId = validateObjectId(id, 'User ID');
    const user = await this.userRepo.deleteById(validatedId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string,
    actor?: AuthenticatedUser,
  ) {
    const validatedId = validateObjectId(id, 'User ID');
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BadRequestException('Invalid refresh token');
    }
    const existing = await this.userRepo.findById(validatedId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    this.assertActorCanManageUser(existing, actor);
    return this.userRepo.updateRefreshToken(validatedId, refreshToken);
  }

  async findAllStaffByOrganization(
    organizationId: string,
    page?: number,
    limit?: number,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedResponse<any> | any[]> {
    const validatedOrgId = validateObjectId(organizationId, 'Organization ID');
    if (
      (actor?.role === Role.ADMIN || actor?.role === Role.STAFF) &&
      actor.orgId !== validatedOrgId
    ) {
      throw new NotFoundException('Staff not found');
    }

    if (page !== undefined && limit !== undefined) {
      const { page: safePage, limit: safeLimit } = getPagination(page, limit);
      const { data, total } = await this.userRepo.findPaginated(
        {
          organizationId: {
            $in: [new Types.ObjectId(validatedOrgId), validatedOrgId],
          },
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

  private assertActorCanManageUser(
    target: { role?: Role; organizationId?: Types.ObjectId | null },
    actor?: AuthenticatedUser,
  ) {
    if (!actor || actor.role === Role.SUPER_ADMIN) {
      return;
    }
    if (actor.role !== Role.ADMIN) {
      throw new NotFoundException('User not found');
    }
    if (!actor.orgId || target.organizationId?.toString() !== actor.orgId) {
      throw new NotFoundException('User not found');
    }
  }
}
