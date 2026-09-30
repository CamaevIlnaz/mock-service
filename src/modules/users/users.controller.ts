import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard';
import type { AvatarUpload } from '../../common/utils/avatar-storage';
import { AuthUserResponseDto } from '../auth/dto/auth-user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Обновить профиль (имя)' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiBadRequestResponse({ description: 'Ошибка валидации' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUserResponseDto> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Сменить пароль' })
  @ApiOkResponse({ description: 'Пароль изменён' })
  @ApiBadRequestResponse({
    description:
      'Текущий пароль неверен, новый совпадает с текущим или не прошёл валидацию',
  })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    await this.usersService.changePassword(user.sub, dto);
    return { ok: true };
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузить или заменить аватар' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @Req() request: FastifyRequest,
  ): Promise<AuthUserResponseDto> {
    const avatar = await this.parseAvatarMultipart(request);
    return this.usersService.updateAvatar(user.sub, avatar);
  }

  private async parseAvatarMultipart(
    request: FastifyRequest,
  ): Promise<AvatarUpload> {
    if (!request.isMultipart()) {
      throw new BadRequestException('Ожидается multipart/form-data');
    }

    let avatar: AvatarUpload | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'avatar' && buffer.byteLength > 0) {
          avatar = { buffer, mimetype: part.mimetype };
        }
      }
    }

    if (!avatar) {
      throw new BadRequestException('Файл avatar обязателен');
    }

    return avatar;
  }
}
