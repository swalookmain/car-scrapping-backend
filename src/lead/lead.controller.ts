import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { LeadLookupQueryDto } from './dto/lead-lookup-query.dto';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { UploadLeadDocumentDto } from './dto/upload-lead-document.dto';
import { DOCUMENT_FILE_FILTER } from 'src/common/utils/document-upload.util';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
const uploadStorage = memoryStorage();

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(jwtAuthGuard, RolesGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new lead' })
  createLead(
    @Body() createLeadDto: CreateLeadDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.createLead(createLeadDto, authenticatedUser);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get leads with filters' })
  getLeads(
    @Query() query: QueryLeadsDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.getLeads(query, authenticatedUser);
  }

  @Get('lookup')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Search open leads for invoice prefill' })
  searchLeadLookup(
    @Query() query: LeadLookupQueryDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.searchLeadLookup(query, authenticatedUser);
  }

  @Get('lookup/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get a lead for invoice prefill' })
  getLeadLookupById(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.getLeadLookupById(id, authenticatedUser);
  }

  @Get(':id/documents')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get lead documents' })
  getLeadDocuments(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.getLeadDocuments(id, authenticatedUser);
  }

  @Post(':id/documents')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload or replace lead documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        aadhaarPageMode: { type: 'string', enum: ['single', 'double'] },
        rcPageMode: { type: 'string', enum: ['single', 'double'] },
        aadhaarFront: { type: 'string', format: 'binary' },
        aadhaarBack: { type: 'string', format: 'binary' },
        rcFront: { type: 'string', format: 'binary' },
        rcBack: { type: 'string', format: 'binary' },
        pan: { type: 'string', format: 'binary' },
        bankDetail: { type: 'string', format: 'binary' },
        vehicleFront: { type: 'string', format: 'binary' },
        vehicleRight: { type: 'string', format: 'binary' },
        vehicleEngine: { type: 'string', format: 'binary' },
        vehicleLeft: { type: 'string', format: 'binary' },
        vehicleBack: { type: 'string', format: 'binary' },
        vehicleInterior: { type: 'string', format: 'binary' },
      },
      required: ['aadhaarPageMode', 'rcPageMode'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aadhaarFront', maxCount: 1 },
        { name: 'aadhaarBack', maxCount: 1 },
        { name: 'rcFront', maxCount: 1 },
        { name: 'rcBack', maxCount: 1 },
        { name: 'pan', maxCount: 1 },
        { name: 'bankDetail', maxCount: 1 },
        { name: 'vehicleFront', maxCount: 1 },
        { name: 'vehicleRight', maxCount: 1 },
        { name: 'vehicleEngine', maxCount: 1 },
        { name: 'vehicleLeft', maxCount: 1 },
        { name: 'vehicleBack', maxCount: 1 },
        { name: 'vehicleInterior', maxCount: 1 },
      ],
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        storage: uploadStorage as MulterOptions['storage'],
        fileFilter: DOCUMENT_FILE_FILTER,
      },
    ),
  )
  uploadLeadDocuments(
    @Param('id') id: string,
    @Body() body: UploadLeadDocumentDto,
    @UploadedFiles()
    files: {
      aadhaarFront?: Express.Multer.File[];
      aadhaarBack?: Express.Multer.File[];
      rcFront?: Express.Multer.File[];
      rcBack?: Express.Multer.File[];
      pan?: Express.Multer.File[];
      bankDetail?: Express.Multer.File[];
      vehicleFront?: Express.Multer.File[];
      vehicleRight?: Express.Multer.File[];
      vehicleEngine?: Express.Multer.File[];
      vehicleLeft?: Express.Multer.File[];
      vehicleBack?: Express.Multer.File[];
      vehicleInterior?: Express.Multer.File[];
    },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.uploadDocuments(
      id,
      body,
      files,
      authenticatedUser,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get lead details by ID' })
  getLeadById(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.getLeadById(id, authenticatedUser);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update a lead' })
  updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.updateLead(id, updateLeadDto, authenticatedUser);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign or reassign a lead' })
  assignLead(
    @Param('id') id: string,
    @Body() assignLeadDto: AssignLeadDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.assignLead(id, assignLeadDto, authenticatedUser);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update lead working status' })
  updateLeadStatus(
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.updateLeadStatus(
      id,
      updateLeadStatusDto,
      authenticatedUser,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a lead' })
  deleteLead(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.leadService.deleteLead(id, authenticatedUser);
  }
}
