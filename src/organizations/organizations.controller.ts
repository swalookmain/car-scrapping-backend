import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { DOCUMENT_FILE_FILTER } from 'src/common/utils/document-upload.util';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { UpdateSubscriptionDto } from '../subscription/dto/update-subscription.dto';
import { OrganizationLetterSettingsService } from './organization-letter-settings.service';
import { UpdateLetterSettingsDto } from './dto/update-letter-settings.dto';

const uploadStorage = memoryStorage();

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(jwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly subscriptionService: SubscriptionService,
    private readonly letterSettingsService: OrganizationLetterSettingsService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Organization with this name already exists',
  })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all organizations with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  findAll(@Query() query: PaginationQueryDto) {
    return this.organizationsService.findAll(query.page, query.limit);
  }

  @Get(':id/subscription')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get subscription for organization' })
  getSubscription(@Param('id') id: string) {
    return this.subscriptionService.getByOrganizationId(id);
  }

  @Patch(':id/subscription')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update subscription for organization' })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(id, dto);
  }

  @Get('letter-settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get organization letterhead settings' })
  getLetterSettings(@GetUser() user: AuthenticatedUser) {
    return this.letterSettingsService.getForUser(user);
  }

  @Patch('letter-settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update organization letterhead settings' })
  updateLetterSettings(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateLetterSettingsDto,
  ) {
    return this.letterSettingsService.updateForUser(user, dto);
  }

  @Post('letter-settings/upload')
  @Roles(Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload logo, RVSF logo, or signature' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: DOCUMENT_FILE_FILTER,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadLetterAsset(
    @GetUser() user: AuthenticatedUser,
    @Body('assetType') assetType: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    if (!['logo', 'rvsfLogo', 'signature'].includes(assetType)) {
      throw new BadRequestException('assetType must be logo, rvsfLogo, or signature');
    }
    return this.letterSettingsService.uploadAsset(
      user,
      assetType as 'logo' | 'rvsfLogo' | 'signature',
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
    );
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  getById(@Param('id') id: string) {
    return this.organizationsService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
