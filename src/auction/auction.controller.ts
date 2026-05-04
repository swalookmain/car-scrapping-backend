import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { CreateAuctionLotDto } from './dto/create-auction-lot.dto';
import { UpdateAuctionLotDto } from './dto/update-auction-lot.dto';
import {
  CreateAuctionVehicleBatchDto,
  CreateAuctionVehicleDto,
} from './dto/create-auction-vehicle.dto';
import { UpdateAuctionVehicleDto } from './dto/update-auction-vehicle.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { AuctionStatus } from 'src/common/enum/auctionStatus.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DOCUMENT_FILE_FILTER } from 'src/common/utils/document-upload.util';
import type { Express } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const uploadStorage = memoryStorage();

@ApiTags('Auction')
@ApiBearerAuth()
@Controller('auctions')
@UseGuards(jwtAuthGuard, RolesGuard)
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  createAuction(
    @Body() createAuctionDto: CreateAuctionDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.createAuction(createAuctionDto, authenticatedUser);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  getAuctions(
    @Query() query: PaginationQueryDto & { status?: AuctionStatus },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getAuctions(
      authenticatedUser,
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get('lookup')
  @Roles(Role.ADMIN, Role.STAFF)
  getLookup(@GetUser() authenticatedUser: AuthenticatedUser) {
    return this.auctionService.getLookup(authenticatedUser);
  }

  @Get('lookup/:id')
  @Roles(Role.ADMIN, Role.STAFF)
  getLookupById(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getLookupById(id, authenticatedUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  getAuctionById(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getAuctionById(id, authenticatedUser);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  updateAuction(
    @Param('id') id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.updateAuction(id, updateAuctionDto, authenticatedUser);
  }

  @Post(':id/close-deal')
  @Roles(Role.ADMIN, Role.STAFF)
  closeDeal(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.closeDeal(id, authenticatedUser);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.STAFF)
  cancelAuction(
    @Param('id') id: string,
    @Body() body: { cancellationReason?: string },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.cancelAuction(
      id,
      body?.cancellationReason,
      authenticatedUser,
    );
  }

  @Post(':id/lots')
  @Roles(Role.ADMIN, Role.STAFF)
  addLot(
    @Param('id') id: string,
    @Body() createAuctionLotDto: CreateAuctionLotDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.addLot(id, createAuctionLotDto, authenticatedUser);
  }

  @Get(':id/lots')
  @Roles(Role.ADMIN, Role.STAFF)
  getLots(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getLots(id, authenticatedUser);
  }

  @Patch('lots/:lotId')
  @Roles(Role.ADMIN, Role.STAFF)
  updateLot(
    @Param('lotId') lotId: string,
    @Body() updateAuctionLotDto: UpdateAuctionLotDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.updateLot(lotId, updateAuctionLotDto, authenticatedUser);
  }

  @Post('lots/:lotId/vehicles')
  @Roles(Role.ADMIN, Role.STAFF)
  addVehicle(
    @Param('lotId') lotId: string,
    @Body() createAuctionVehicleDto: CreateAuctionVehicleDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.addVehicle(
      lotId,
      createAuctionVehicleDto,
      authenticatedUser,
    );
  }

  @Post('lots/:lotId/vehicles/batch')
  @Roles(Role.ADMIN, Role.STAFF)
  addVehiclesBatch(
    @Param('lotId') lotId: string,
    @Body() createAuctionVehicleBatchDto: CreateAuctionVehicleBatchDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.addVehiclesBatch(
      lotId,
      createAuctionVehicleBatchDto,
      authenticatedUser,
    );
  }

  @Get('lots/:lotId/vehicles')
  @Roles(Role.ADMIN, Role.STAFF)
  getVehiclesByLot(
    @Param('lotId') lotId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getVehiclesByLot(lotId, authenticatedUser);
  }

  @Patch('vehicles/:vehicleId')
  @Roles(Role.ADMIN, Role.STAFF)
  updateVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() updateAuctionVehicleDto: UpdateAuctionVehicleDto,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.updateVehicle(
      vehicleId,
      updateAuctionVehicleDto,
      authenticatedUser,
    );
  }

  @Post('vehicles/:vehicleId/images')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        vehicleFront: { type: 'string', format: 'binary' },
        vehicleRight: { type: 'string', format: 'binary' },
        vehicleEngine: { type: 'string', format: 'binary' },
        vehicleLeft: { type: 'string', format: 'binary' },
        vehicleBack: { type: 'string', format: 'binary' },
        vehicleInterior: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'vehicleFront', maxCount: 1 },
        { name: 'vehicleRight', maxCount: 1 },
        { name: 'vehicleEngine', maxCount: 1 },
        { name: 'vehicleLeft', maxCount: 1 },
        { name: 'vehicleBack', maxCount: 1 },
        { name: 'vehicleInterior', maxCount: 1 },
      ],
      {
        storage: uploadStorage as MulterOptions['storage'],
        fileFilter: DOCUMENT_FILE_FILTER,
      },
    ),
  )
  uploadVehicleImages(
    @Param('vehicleId') vehicleId: string,
    @UploadedFiles()
    files: {
      vehicleFront?: Express.Multer.File[];
      vehicleRight?: Express.Multer.File[];
      vehicleEngine?: Express.Multer.File[];
      vehicleLeft?: Express.Multer.File[];
      vehicleBack?: Express.Multer.File[];
      vehicleInterior?: Express.Multer.File[];
    },
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.uploadVehicleImages(
      vehicleId,
      files,
      authenticatedUser,
    );
  }

  @Get('vehicles/:vehicleId/images')
  @Roles(Role.ADMIN, Role.STAFF)
  getVehicleImages(
    @Param('vehicleId') vehicleId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.getVehicleImages(vehicleId, authenticatedUser);
  }

  @Delete('lots/:lotId')
  @Roles(Role.ADMIN, Role.STAFF)
  deleteLot(
    @Param('lotId') lotId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.deleteLot(lotId, authenticatedUser);
  }

  @Delete('vehicles/:vehicleId')
  @Roles(Role.ADMIN, Role.STAFF)
  deleteVehicle(
    @Param('vehicleId') vehicleId: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.deleteVehicle(vehicleId, authenticatedUser);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  deleteAuction(
    @Param('id') id: string,
    @GetUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.auctionService.deleteAuction(id, authenticatedUser);
  }
}
