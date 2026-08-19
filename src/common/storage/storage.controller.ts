import {
  Controller,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { StorageService } from '../services/storage.service';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(jwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Delete(':storageKey(*)')
  @Roles(Role.ADMIN, Role.STAFF)
  async deleteFile(@Param('storageKey') storageKey: string) {
    await this.storageService.deleteFile(storageKey);
    return { message: 'File deleted' };
  }
}
