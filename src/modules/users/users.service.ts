import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AvatarUpload } from '../../common/utils/avatar-storage';
import {
  removeAvatarFile,
  saveAvatarFile,
  toAvatarUrl,
} from '../../common/utils/avatar-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUserResponseDto } from '../auth/dto/auth-user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async updateAvatar(
    userId: string,
    avatar: AvatarUpload,
  ): Promise<AuthUserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const uploadsDir = this.configService.get<string>(
      'app.uploadsDir',
      'uploads',
    );
    const previousPath = user.avatarPath;
    const avatarPath = await saveAvatarFile(avatar, uploadsDir, user.id);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarPath },
    });

    await removeAvatarFile(uploadsDir, previousPath);

    return {
      id: updated.id,
      login: updated.login,
      firstName: updated.firstName,
      role: updated.role,
      avatarUrl: toAvatarUrl(updated.avatarPath),
    };
  }
}
