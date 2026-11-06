import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { PublicUserDto } from '../common/dto/public-user.dto.js';
import {
  clearRefreshTokenCookie,
  extractRefreshTokenCookie,
  setRefreshTokenCookie,
} from '../common/utils/refresh-token-cookie.js';
import { AuthService, type AuthSession } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieSecure: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.refreshCookieSecure = this.computeRefreshCookieSecure();
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un trabajador o dueno de casa' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.withRefreshCookie(
      res,
      await this.authService.register(dto),
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.withRefreshCookie(res, await this.authService.login(dto));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary:
      'Renovar el access token (usa la cookie HttpOnly del refresh token)',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = extractRefreshTokenCookie(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    return this.withRefreshCookie(
      res,
      await this.authService.refresh(refreshToken),
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesion (revoca el refresh token)' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const refreshToken = extractRefreshTokenCookie(req);

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res, this.refreshCookieSecure);

    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  @ApiOkResponse({ type: PublicUserDto })
  me(@CurrentUser('userId') userId: string): Promise<PublicUserDto> {
    return this.authService.me(userId);
  }

  private withRefreshCookie(
    res: Response,
    session: AuthSession,
  ): AuthResponseDto {
    setRefreshTokenCookie(res, session.refreshToken, {
      secure: this.refreshCookieSecure,
      maxAgeMs: session.refreshTokenExpiresIn * 1000,
    });

    return {
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresIn: session.accessTokenExpiresIn,
    };
  }

  private computeRefreshCookieSecure(): boolean {
    const override = this.config.get<string | undefined>('COOKIE_SECURE');
    if (override !== undefined && override !== '') {
      return override === 'true';
    }
    return this.config.get<string>('NODE_ENV', 'development') === 'production';
  }
}
