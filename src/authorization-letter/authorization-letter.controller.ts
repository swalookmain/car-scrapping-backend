import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { jwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ModulesGuard } from 'src/common/guards/modules.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Role } from 'src/common/enum/role.enum';
import { GetUser } from 'src/common/decorators/user.decorator';
import type { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';
import { AuthorizationLetterService } from './authorization-letter.service';
import { CreateAuthorizationLetterDto } from './dto/create-authorization-letter.dto';
import { UpdateAuthorizationLetterDto } from './dto/update-authorization-letter.dto';
import { SetModule } from 'src/common/decorators/set-module.decorator';
import { APP_MODULES } from 'src/common/access/app-modules';

@ApiTags('Authorization Letters')
@ApiBearerAuth()
@Controller('authorization-letters')
@UseGuards(jwtAuthGuard, RolesGuard, ModulesGuard)
@SetModule(APP_MODULES.AUCTIONS.id)
export class AuthorizationLetterController {
  constructor(
    private readonly authorizationLetterService: AuthorizationLetterService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List authorization letters' })
  list(@GetUser() user: AuthenticatedUser) {
    return this.authorizationLetterService.list(user);
  }

  @Get('eligible-auctions')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List auctions eligible for authorization letter' })
  getEligibleAuctions(@GetUser() user: AuthenticatedUser) {
    return this.authorizationLetterService.getEligibleAuctions(user);
  }

  @Get('auction/:auctionId/eligibility')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get authorization letter eligibility for an auction' })
  getEligibility(
    @GetUser() user: AuthenticatedUser,
    @Param('auctionId') auctionId: string,
  ) {
    return this.authorizationLetterService.getEligibilityForAuction(user, auctionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create authorization letter draft' })
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateAuthorizationLetterDto,
  ) {
    return this.authorizationLetterService.create(user, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get authorization letter by ID' })
  getById(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.authorizationLetterService.getById(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update draft authorization letter' })
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAuthorizationLetterDto,
  ) {
    return this.authorizationLetterService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Delete draft authorization letter' })
  delete(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.authorizationLetterService.delete(user, id);
  }

  @Get(':id/preview')
  @Roles(Role.ADMIN, Role.STAFF)
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Preview authorization letter HTML' })
  async preview(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.authorizationLetterService.renderHtml(user, id);
    res.send(html);
  }

  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Download authorization letter PDF' })
  async downloadPdf(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const letter = await this.authorizationLetterService.getById(user, id);
    const pdf = await this.authorizationLetterService.generatePdf(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${letter.letterNumber}.pdf"`,
    );
    res.send(pdf);
  }
}
