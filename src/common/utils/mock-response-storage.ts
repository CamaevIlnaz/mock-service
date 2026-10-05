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

export const JSON_MIME_TYPE = 'application/json';
export const PDF_MIME_TYPE = 'application/pdf';

const MIME_TO_EXT: Record<string, string> = {
  [JSON_MIME_TYPE]: 'json',
  [PDF_MIME_TYPE]: 'pdf',
};

const EXT_TO_MIME: Record<string, string> = {
  json: JSON_MIME_TYPE,
  pdf: PDF_MIME_TYPE,
};

const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');

export type MockResponseUpload = {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
};

export function extensionForMimeType(mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new BadRequestException(
      `Неподдерживаемый MIME-тип файла: ${mimeType}. Допустимы только JSON и PDF`,
    );
  }
  return ext;
}

function extensionOf(fileName: string): string | undefined {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return undefined;
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
}

/**
 * Определяет MIME-тип загрузки: браузеры часто присылают JSON как
 * application/octet-stream или text/plain, поэтому учитываем расширение имени.
 */
export function resolveMockResponseMimeType(
  mimetype: string,
  originalName: string,
): string {
  const baseMime = mimetype.split(';')[0].trim().toLowerCase();
  if (MIME_TO_EXT[baseMime]) {
    return baseMime;
  }

  const byExtension = EXT_TO_MIME[extensionOf(originalName) ?? ''];
  if (byExtension) {
    return byExtension;
  }

  throw new BadRequestException(
    `Неподдерживаемый тип файла: ${mimetype || 'не указан'}. Допустимы только JSON и PDF`,
  );
}

export function assertMockResponseUpload(
  file: MockResponseUpload,
): asserts file is MockResponseUpload {
  extensionForMimeType(file.mimetype);

  if (file.buffer.byteLength === 0) {
    throw new BadRequestException('Файл ответа пуст');
  }

  if (file.buffer.byteLength > MAX_MOCK_RESPONSE_BYTES) {
    throw new BadRequestException(
      'Размер файла ответа не должен превышать 5 МБ',
    );
  }

  if (file.mimetype === JSON_MIME_TYPE) {
    try {
      JSON.parse(file.buffer.toString('utf8').replace(/^\uFEFF/, ''));
    } catch {
      throw new BadRequestException('Файл не является валидным JSON');
    }
  }

  if (
    file.mimetype === PDF_MIME_TYPE &&
    !file.buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
  ) {
    throw new BadRequestException('Файл не является валидным PDF');
  }
}

/**
 * Приводит имя файла к виду с расширением, соответствующим MIME-типу.
 */
export function normalizeMockResponseName(
  originalName: string,
  mimeType: string,
): string {
  const ext = extensionForMimeType(mimeType);
  const name = originalName.trim() || 'response';
  return extensionOf(name) === ext ? name : `${name}.${ext}`;
}

export function buildCopyName(originalName: string): string {
  const ext = extensionOf(originalName);
  if (!ext) {
    return `${originalName} (копия)`;
  }
  const base = originalName.slice(0, -(ext.length + 1));
  return `${base} (копия).${ext}`;
}

export function buildContentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function buildMockResponseStoragePath(
  mockServerId: number,
  storageKey: string,
  mimeType: string,
): string {
  const ext = extensionForMimeType(mimeType);
  return join(
    'mock-responses',
    String(mockServerId),
    `${storageKey}.${ext}`,
  ).replace(/\\/g, '/');
}

export async function saveMockResponseFile(
  uploadsDir: string,
  mockServerId: number,
  file: MockResponseUpload,
  storageKey: string = randomUUID().replace(/-/g, ''),
): Promise<{ storageKey: string; storagePath: string; sizeBytes: number }> {
  assertMockResponseUpload(file);

  const storagePath = buildMockResponseStoragePath(
    mockServerId,
    storageKey,
    file.mimetype,
  );
  const absolutePath = join(uploadsDir, storagePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer);

  return {
    storageKey,
    storagePath,
    sizeBytes: file.buffer.byteLength,
  };
}

export async function copyMockResponseFile(
  uploadsDir: string,
  sourceStoragePath: string,
  targetMockServerId: number,
  mimeType: string,
  storageKey: string = randomUUID().replace(/-/g, ''),
): Promise<{ storageKey: string; storagePath: string }> {
  const storagePath = buildMockResponseStoragePath(
    targetMockServerId,
    storageKey,
    mimeType,
  );
  const sourceAbsolute = join(uploadsDir, sourceStoragePath);
  const targetAbsolute = join(uploadsDir, storagePath);

  await mkdir(dirname(targetAbsolute), { recursive: true });
  await copyFile(sourceAbsolute, targetAbsolute);

  return { storageKey, storagePath };
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
  mockServerId: number,
): Promise<void> {
  const absoluteDir = join(uploadsDir, 'mock-responses', String(mockServerId));

  try {
    await rm(absoluteDir, { recursive: true, force: true });
  } catch {
    // каталог мог отсутствовать
  }
}
