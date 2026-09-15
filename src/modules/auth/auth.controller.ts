import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard';
import type { AvatarUpload } from '../../common/utils/avatar-storage';
import { AuthService } from './auth.service';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['login', 'password', 'firstName'],
      properties: {
        login: { type: 'string', example: 'ivanov' },
        password: { type: 'string', example: 'secret123' },
        firstName: { type: 'string', example: 'Иван' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  async register(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const { fields, avatar } = await this.parseRegisterMultipart(request);
    const dto = plainToInstance(RegisterDto, fields);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      throw new BadRequestException(messages);
    }

    return this.authService.register(dto, avatar, reply);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход по логину и паролю' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Неверный логин или пароль' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    return this.authService.login(dto, reply);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Выход (очистка cookie)' })
  @ApiOkResponse({ description: 'Сессия завершена' })
  logout(@Res({ passthrough: true }) reply: FastifyReply): { ok: true } {
    this.authService.logout(reply);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async me(@CurrentUser() user: JwtPayload): Promise<AuthUserResponseDto> {
    return this.authService.me(user.sub);
  }

  private async parseRegisterMultipart(request: FastifyRequest): Promise<{
    fields: Record<string, string>;
    avatar: AvatarUpload | undefined;
  }> {
    if (!request.isMultipart()) {
      throw new BadRequestException('Ожидается multipart/form-data');
    }

    const fields: Record<string, string> = {};
    let avatar: AvatarUpload | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'avatar' && buffer.byteLength > 0) {
          avatar = { buffer, mimetype: part.mimetype };
        }
      } else if (typeof part.value === 'string') {
        fields[part.fieldname] = part.value;
      }
    }

    return { fields, avatar };
  }
}
