import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { DOCUMENT_FILE_FILTER } from 'src/common/utils/document-upload.util';
import { LifecycleService } from './lifecycle.service';
import { UpdateLotOutcomeBatchDto } from './dto/update-lot-outcome.dto';
import { CreateLotPaymentDto } from './dto/create-lot-payment.dto';
import { UpdateAcceptanceLetterDto } from './dto/update-acceptance-letter.dto';
import { UpdateLotDeliveryDto } from './dto/update-lot-delivery.dto';
import { UpdateLotRcmDto } from './dto/update-lot-rcm.dto';
import { AddLotPenaltyDto } from './dto/add-lot-penalty.dto';

const uploadStorage = memoryStorage();

@ApiTags('Auction Lifecycle')
@ApiBearerAuth()
@Controller('auctions')
@UseGuards(jwtAuthGuard, RolesGuard)
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Get(':id/lifecycle')
  @Roles(Role.ADMIN, Role.STAFF)
  getLifecycle(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.getLifecycle(id, user);
  }

  @Patch(':id/lifecycle/outcome')
  @Roles(Role.ADMIN, Role.STAFF)
  updateOutcome(
    @Param('id') id: string,
    @Body() dto: UpdateLotOutcomeBatchDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.updateOutcome(id, dto, user);
  }

  @Post('lots/:lotId/payments')
  @Roles(Role.ADMIN, Role.STAFF)
  recordPayment(
    @Param('lotId') lotId: string,
    @Body() dto: CreateLotPaymentDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.recordPayment(lotId, dto, user);
  }

  @Post('lots/:lotId/penalty')
  @Roles(Role.ADMIN, Role.STAFF)
  addPenalty(
    @Param('lotId') lotId: string,
    @Body() dto: AddLotPenaltyDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.addPenalty(lotId, dto, user);
  }

  @Patch('lots/:lotId/acceptance-letter')
  @Roles(Role.ADMIN, Role.STAFF)
  updateAcceptanceLetter(
    @Param('lotId') lotId: string,
    @Body() dto: UpdateAcceptanceLetterDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.updateAcceptanceLetter(lotId, dto, user);
  }

  @Patch('lots/:lotId/delivery')
  @Roles(Role.ADMIN, Role.STAFF)
  updateDelivery(
    @Param('lotId') lotId: string,
    @Body() dto: UpdateLotDeliveryDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.updateDelivery(lotId, dto, user);
  }

  @Post('lots/:lotId/gate-pass')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gatePassDate: { type: 'string', format: 'date' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['gatePassDate', 'file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: DOCUMENT_FILE_FILTER,
    }),
  )
  uploadGatePass(
    @Param('lotId') lotId: string,
    @Body('gatePassDate') gatePassDate: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.uploadGatePass(lotId, gatePassDate, file as Express.Multer.File, user);
  }

  @Delete('lots/:lotId/gate-pass-file')
  @Roles(Role.ADMIN, Role.STAFF)
  deleteGatePassFile(
    @Param('lotId') lotId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.deleteGatePassFile(lotId, user);
  }

  @Patch('lots/:lotId/rcm')
  @Roles(Role.ADMIN, Role.STAFF)
  updateRcm(
    @Param('lotId') lotId: string,
    @Body() dto: UpdateLotRcmDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.lifecycleService.updateRcm(lotId, dto, user);
  }
}
