import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { hashPassword } from 'src/common/utils/password.util';
import { Role } from 'src/common/enum/role.enum';


@Injectable()
export class SuperAdminBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(
    private readonly usersRepo: UsersRepository,
  ) {}

  async onModuleInit() {
    const existing = await this.usersRepo.findByEmail(
      process.env.SUPER_ADMIN_EMAIL || 'swalook',
    );

    if (existing) {
      this.logger.log('Super admin already exists');
      return;
    }

    const passwordHash = await hashPassword(
      process.env.SUPER_ADMIN_PASSWORD || 'test',
    );

    await this.usersRepo.create({
      email: process.env.SUPER_ADMIN_EMAIL || 'swalook',
      name: 'swalook',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
      organizationId: null,
      isActive: true,
    });

    this.logger.warn('🚨 Super admin created. Change password immediately.');
  }
}
