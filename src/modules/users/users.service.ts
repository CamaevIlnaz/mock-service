import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { AvatarUpload } from '../../common/utils/avatar-storage';
import {
  removeAvatarFile,
  saveAvatarFile,
} from '../../common/utils/avatar-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthUserResponseDto } from '../auth/dto/auth-user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<AuthUserResponseDto> {
    await this.findUserOrThrow(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName },
    });

    return this.authService.toAuthUser(updated);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserOrThrow(userId);

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Новый пароль должен отличаться от текущего',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async updateAvatar(
    userId: number,
    avatar: AvatarUpload,
  ): Promise<AuthUserResponseDto> {
    const user = await this.findUserOrThrow(userId);

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

    return this.authService.toAuthUser(updated);
  }

  private async findUserOrThrow(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }
}
