import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export type AvatarUpload = {
  buffer: Buffer;
  mimetype: string;
};

export async function saveAvatarFile(
  file: AvatarUpload,
  uploadsDir: string,
  userId: number,
): Promise<string> {
  const mimeType = file.mimetype;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(
      'Аватар должен быть изображением JPEG, PNG или WebP',
    );
  }

  if (file.buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new BadRequestException('Размер аватара не должен превышать 5 МБ');
  }

  if (file.buffer.byteLength === 0) {
    throw new BadRequestException('Файл аватара пуст');
  }

  const ext = MIME_TO_EXT[mimeType];
  const relativePath = join('avatars', `${userId}-${randomUUID()}.${ext}`);
  const absoluteDir = join(uploadsDir, 'avatars');
  const absolutePath = join(uploadsDir, relativePath);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, file.buffer);

  return relativePath.replace(/\\/g, '/');
}

export async function removeAvatarFile(
  uploadsDir: string,
  avatarPath: string | null | undefined,
): Promise<void> {
  if (!avatarPath) {
    return;
  }

  try {
    await unlink(join(uploadsDir, avatarPath));
  } catch {
    // файл мог уже отсутствовать
  }
}

export function toAvatarUrl(
  avatarPath: string | null | undefined,
): string | null {
  if (!avatarPath) {
    return null;
  }

  return `/uploads/${avatarPath.replace(/\\/g, '/')}`;
}
