import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { FastifyReply } from 'fastify';
import type { AvatarUpload } from '../../common/utils/avatar-storage';
import { saveAvatarFile, toAvatarUrl } from '../../common/utils/avatar-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    avatar: AvatarUpload | undefined,
    reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (existing) {
      throw new ConflictException('Пользователь с таким login уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user = await this.prisma.user.create({
      data: {
        login: dto.login,
        passwordHash,
        firstName: dto.firstName,
      },
    });

    if (avatar) {
      const uploadsDir = this.configService.get<string>(
        'app.uploadsDir',
        'uploads',
      );
      try {
        const avatarPath = await saveAvatarFile(avatar, uploadsDir, user.id);
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarPath },
        });
      } catch (error) {
        await this.prisma.user.delete({ where: { id: user.id } });
        throw error;
      }
    }

    await this.setAuthCookie(reply, user);
    return this.toAuthUser(user);
  }

  async login(
    dto: LoginDto,
    reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    await this.setAuthCookie(reply, user);
    return this.toAuthUser(user);
  }

  logout(reply: FastifyReply): void {
    const cookieName = this.configService.get<string>(
      'app.cookieName',
      'access_token',
    );
    reply.clearCookie(cookieName, { path: '/' });
  }

  async me(userId: number): Promise<AuthUserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Не авторизован');
    }

    return this.toAuthUser(user);
  }

  toAuthUser(user: User): AuthUserResponseDto {
    return {
      id: user.id,
      login: user.login,
      firstName: user.firstName,
      role: user.role,
      avatarUrl: toAvatarUrl(user.avatarPath),
    };
  }

  private async setAuthCookie(reply: FastifyReply, user: User): Promise<void> {
    const cookieName = this.configService.get<string>(
      'app.cookieName',
      'access_token',
    );
    const nodeEnv = this.configService.get<string>(
      'app.nodeEnv',
      'development',
    );
    const expiresIn = this.configService.get<string>('app.jwtExpiresIn', '7d');

    const token = await this.jwtService.signAsync({
      sub: user.id,
      login: user.login,
      role: user.role,
    });

    reply.setCookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      path: '/',
      maxAge: this.parseExpiresInToSeconds(expiresIn),
    });
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
