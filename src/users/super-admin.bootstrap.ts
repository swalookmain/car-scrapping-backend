import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { hashPassword } from 'src/common/utils/password.util';
import { Role } from 'src/common/enum/role.enum';

@Injectable()
export class SuperAdminBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(private readonly usersRepo: UsersRepository) {}

  async onModuleInit() {
    try {
      const email = process.env.SUPER_ADMIN_EMAIL || 'swalook';
      this.logger.log(`Checking for super admin with email: ${email}`);

      const existing = await this.usersRepo.findByEmail(email);

      if (existing) {
        this.logger.log(`✅ Super admin already exists: ${email}`);
        return;
      }

      this.logger.log(`Creating super admin: ${email}`);
      const passwordHash = await hashPassword(
        process.env.SUPER_ADMIN_PASSWORD || 'test',
      );

      await this.usersRepo.create({
        email,
        name: 'swalook',
        password: passwordHash,
        role: Role.SUPER_ADMIN,
        organizationId: null,
        isActive: true,
      });

      this.logger.warn(
        `🚨 Super admin created successfully! Email: ${email}, Password: ${process.env.SUPER_ADMIN_PASSWORD || 'test'}`,
      );
      this.logger.warn('⚠️ Change password immediately after first login!');
    } catch (error) {
      this.logger.error(
        `❌ Failed to create super admin: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
    }
  }
}
