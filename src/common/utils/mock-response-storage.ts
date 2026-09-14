import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

const MAX_MOCK_RESPONSE_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/csv': 'csv',
  'application/pdf': 'pdf',
  'application/javascript': 'js',
  'application/octet-stream': 'bin',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXT));

export type MockResponseUpload = {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
};

export function extensionForMimeType(mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new BadRequestException(
      `Неподдерживаемый MIME-тип файла: ${mimeType}`,
    );
  }
  return ext;
}

export function assertMockResponseUpload(
  file: MockResponseUpload,
): asserts file is MockResponseUpload {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      `Неподдерживаемый MIME-тип файла: ${file.mimetype}`,
    );
  }

  if (file.buffer.byteLength === 0) {
    throw new BadRequestException('Файл ответа пуст');
  }

  if (file.buffer.byteLength > MAX_MOCK_RESPONSE_BYTES) {
    throw new BadRequestException(
      'Размер файла ответа не должен превышать 5 МБ',
    );
  }
}

export function buildMockResponseStoragePath(
  mockServerId: string,
  fileId: string,
  mimeType: string,
): string {
  const ext = extensionForMimeType(mimeType);
  return join('mock-responses', mockServerId, `${fileId}.${ext}`).replace(
    /\\/g,
    '/',
  );
}

export async function saveMockResponseFile(
  uploadsDir: string,
  mockServerId: string,
  file: MockResponseUpload,
  fileId: string = randomUUID().replace(/-/g, ''),
): Promise<{ fileId: string; storagePath: string; sizeBytes: number }> {
  assertMockResponseUpload(file);

  const storagePath = buildMockResponseStoragePath(
    mockServerId,
    fileId,
    file.mimetype,
  );
  const absolutePath = join(uploadsDir, storagePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer);

  return {
    fileId,
    storagePath,
    sizeBytes: file.buffer.byteLength,
  };
}

export async function copyMockResponseFile(
  uploadsDir: string,
  sourceStoragePath: string,
  targetMockServerId: string,
  mimeType: string,
  fileId: string = randomUUID().replace(/-/g, ''),
): Promise<{ fileId: string; storagePath: string }> {
  const storagePath = buildMockResponseStoragePath(
    targetMockServerId,
    fileId,
    mimeType,
  );
  const sourceAbsolute = join(uploadsDir, sourceStoragePath);
  const targetAbsolute = join(uploadsDir, storagePath);

  await mkdir(dirname(targetAbsolute), { recursive: true });
  await copyFile(sourceAbsolute, targetAbsolute);

  return { fileId, storagePath };
}

export async function readMockResponseFile(
  uploadsDir: string,
  storagePath: string,
): Promise<Buffer> {
  return readFile(join(uploadsDir, storagePath));
}

export async function removeMockResponseFile(
  uploadsDir: string,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) {
    return;
  }

  try {
    await unlink(join(uploadsDir, storagePath));
  } catch {
    // файл мог уже отсутствовать
  }
}

export async function removeMockServerResponseDir(
  uploadsDir: string,
  mockServerId: string,
): Promise<void> {
  const absoluteDir = join(uploadsDir, 'mock-responses', mockServerId);

  try {
    await rm(absoluteDir, { recursive: true, force: true });
  } catch {
    // каталог мог отсутствовать
  }
}
