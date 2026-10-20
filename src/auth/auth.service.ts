import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { Role } from '../generated/prisma/enums.js';
import type {
  UserModel,
  WorkerProfileModel,
} from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { PublicUserDto } from '../common/dto/public-user.dto.js';
import type { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { AuthTokens } from './interfaces/auth-tokens.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

type UserWithProfile = UserModel & {
  workerProfile?: WorkerProfileModel | null;
};

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El correo ya esta registrado');
    }

    const password = await hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        phone: dto.phone,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        workerProfile: dto.role === Role.WORKER ? { create: {} } : undefined,
      },
      include: { workerProfile: true },
    });

    const tokens = await this.issueTokens(user);
    return this.buildResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { workerProfile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const matches = await compare(dto.password, user.password);
    if (!matches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.issueTokens(user);
    return this.buildResponse(user, tokens);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.revokedAt !== null ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { workerProfile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Rotacion de refresh tokens: se revoca el usado y se emite uno nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return this.buildResponse(user, tokens);
  }

  async logout(dto: RefreshTokenDto): Promise<{ success: boolean }> {
    const tokenHash = this.hashToken(dto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async me(userId: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return PublicUserDto.fromUser(user);
  }

  private async issueTokens(user: UserWithProfile): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const accessExp = this.decodeExp(accessToken);
    const refreshExp = this.decodeExp(refreshToken);
    const now = Math.floor(Date.now() / 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(refreshExp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: Math.max(accessExp - now, 0),
      refreshTokenExpiresIn: Math.max(refreshExp - now, 0),
    };
  }

  private buildResponse(
    user: UserWithProfile,
    tokens: AuthTokens,
  ): AuthResponseDto {
    return {
      user: PublicUserDto.fromUser(user),
      ...tokens,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private decodeExp(token: string): number {
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp ?? Math.floor(Date.now() / 1000);
  }
}
