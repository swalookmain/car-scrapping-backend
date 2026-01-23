import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { extractMetadataFromRequest } from './utils/metadata.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated or not assigned to organization',
  })
  async login(
    @Body() dto: CreateAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const metadata = extractMetadataFromRequest(req);
    const result = await this.authService.login(
      dto.email,
      dto.password,
      metadata,
    );
    // Set refresh token in HTTP-only cookie
    const maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/',
    });

    // Return response without refreshToken in body for security
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken, ...response } = result;
    return response;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie or body
    const cookieToken =
      req.cookies &&
      typeof req.cookies === 'object' &&
      'refreshToken' in req.cookies
        ? (req.cookies as { refreshToken?: string }).refreshToken
        : undefined;
    const bodyToken =
      req.body && typeof req.body === 'object' && 'refreshToken' in req.body
        ? (req.body as { refreshToken?: string }).refreshToken
        : undefined;
    const refreshToken = cookieToken || bodyToken;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BadRequestException('Refresh token not found');
    }

    const metadata = extractMetadataFromRequest(req);
    const result = await this.authService.refreshToken(refreshToken, metadata);

    // Update refresh token in HTTP-only cookie
    const maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/',
    });

    // Return only access token
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie or body
    const cookieToken =
      req.cookies &&
      typeof req.cookies === 'object' &&
      'refreshToken' in req.cookies
        ? (req.cookies as { refreshToken?: string }).refreshToken
        : undefined;
    const bodyToken =
      req.body && typeof req.body === 'object' && 'refreshToken' in req.body
        ? (req.body as { refreshToken?: string }).refreshToken
        : undefined;
    const refreshToken = cookieToken || bodyToken;

    if (refreshToken && typeof refreshToken === 'string') {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logout successful' };
  }
}
