import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import type { FastifyRequest } from 'fastify';

export type JwtPayload = {
  sub: string;
  login: string;
  role: Role;
};

export type AuthenticatedRequest = FastifyRequest & {
  user: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = this.configService.get<string>(
      'app.cookieName',
      'access_token',
    );
    const token = request.cookies?.[cookieName];

    if (!token) {
      throw new UnauthorizedException('Не авторизован');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Не авторизован');
    }
  }
}
