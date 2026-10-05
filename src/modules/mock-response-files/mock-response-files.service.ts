import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockResponseFile, Prisma } from '@prisma/client';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import {
  buildContentDisposition,
  buildCopyName,
  copyMockResponseFile,
  JSON_MIME_TYPE,
  normalizeMockResponseName,
  readMockResponseFile,
  removeMockResponseFile,
  saveMockResponseFile,
  type MockResponseUpload,
} from '../../common/utils/mock-response-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { MockServersService } from '../mock-servers/mock-servers.service';
import { CopyMockResponseFileDto } from './dto/copy-mock-response-file.dto';
import { ListMockResponseFilesQueryDto } from './dto/list-mock-response-files-query.dto';
import { MockResponseFileMetaDto } from './dto/mock-response-file-meta.dto';
import { PaginatedMockResponseFilesResponseDto } from './dto/paginated-mock-response-files-response.dto';
import { UpdateMockResponseFileDto } from './dto/update-mock-response-file.dto';

@Injectable()
export class MockResponseFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockServersService: MockServersService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    userId: number,
    mockServerId: number,
    query: ListMockResponseFilesQueryDto,
  ): Promise<PaginatedMockResponseFilesResponseDto> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MockResponseFileWhereInput = { mockServerId };

    const search = query.search?.trim();
    if (search) {
      where.originalName = { contains: search, mode: 'insensitive' };
    }

    const [total, files] = await this.prisma.$transaction([
      this.prisma.mockResponseFile.count({ where }),
      this.prisma.mockResponseFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: files.map((file) => this.toMeta(file)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(
    userId: number,
    mockServerId: number,
    fileId: number,
  ): Promise<MockResponseFileMetaDto> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);
    return this.toMeta(file);
  }

  async upload(
    userId: number,
    mockServerId: number,
    upload: MockResponseUpload,
  ): Promise<MockResponseFileMetaDto> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const uploadsDir = this.getUploadsDir();
    const saved = await saveMockResponseFile(uploadsDir, mockServerId, upload);

    try {
      const file = await this.prisma.mockResponseFile.create({
        data: {
          mockServerId,
          originalName: upload.originalName,
          mimeType: upload.mimetype,
          sizeBytes: saved.sizeBytes,
          storagePath: saved.storagePath,
        },
      });
      return this.toMeta(file);
    } catch (error) {
      await removeMockResponseFile(uploadsDir, saved.storagePath);
      throw error;
    }
  }

  async copy(
    userId: number,
    mockServerId: number,
    fileId: number,
    dto: CopyMockResponseFileDto,
  ): Promise<MockResponseFileMetaDto> {
    const source = await this.findOwnedFileOrFail(userId, mockServerId, fileId);

    const targetMockServerId = dto.targetMockServerId ?? mockServerId;
    if (targetMockServerId !== mockServerId) {
      await this.mockServersService.findOwnedOrFail(userId, targetMockServerId);
    }

    const originalName = normalizeMockResponseName(
      dto.originalName ?? buildCopyName(source.originalName),
      source.mimeType,
    );

    const uploadsDir = this.getUploadsDir();
    const copied = await copyMockResponseFile(
      uploadsDir,
      source.storagePath,
      targetMockServerId,
      source.mimeType,
    );

    try {
      const file = await this.prisma.mockResponseFile.create({
        data: {
          mockServerId: targetMockServerId,
          originalName,
          mimeType: source.mimeType,
          sizeBytes: source.sizeBytes,
          storagePath: copied.storagePath,
        },
      });
      return this.toMeta(file);
    } catch (error) {
      await removeMockResponseFile(uploadsDir, copied.storagePath);
      throw error;
    }
  }

  async rename(
    userId: number,
    mockServerId: number,
    fileId: number,
    dto: UpdateMockResponseFileDto,
  ): Promise<MockResponseFileMetaDto> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);

    const updated = await this.prisma.mockResponseFile.update({
      where: { id: file.id },
      data: {
        originalName: normalizeMockResponseName(
          dto.originalName,
          file.mimeType,
        ),
      },
    });
    return this.toMeta(updated);
  }

  async updateContent(
    userId: number,
    mockServerId: number,
    fileId: number,
    content: Buffer,
  ): Promise<MockResponseFileMetaDto> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);

    if (file.mimeType !== JSON_MIME_TYPE) {
      throw new BadRequestException(
        'Редактировать содержимое можно только у JSON-файлов',
      );
    }

    const uploadsDir = this.getUploadsDir();
    const saved = await saveMockResponseFile(uploadsDir, mockServerId, {
      buffer: content,
      mimetype: file.mimeType,
      originalName: file.originalName,
    });

    let updated: MockResponseFile;
    try {
      updated = await this.prisma.mockResponseFile.update({
        where: { id: file.id },
        data: {
          sizeBytes: saved.sizeBytes,
          storagePath: saved.storagePath,
        },
      });
    } catch (error) {
      await removeMockResponseFile(uploadsDir, saved.storagePath);
      throw error;
    }

    await removeMockResponseFile(uploadsDir, file.storagePath);
    return this.toMeta(updated);
  }

  async getContent(
    userId: number,
    mockServerId: number,
    fileId: number,
  ): Promise<StreamableFile> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);
    const uploadsDir = this.getUploadsDir();

    try {
      await readMockResponseFile(uploadsDir, file.storagePath);
    } catch {
      throw new NotFoundException('Файл ответа не найден на диске');
    }

    return new StreamableFile(
      createReadStream(join(uploadsDir, file.storagePath)),
      {
        type: file.mimeType,
        disposition: buildContentDisposition(file.originalName),
      },
    );
  }

  async remove(
    userId: number,
    mockServerId: number,
    fileId: number,
  ): Promise<void> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);

    const usedByRules = await this.prisma.mockRule.findMany({
      where: { responseFileId: fileId },
      select: { id: true, name: true },
    });

    if (usedByRules.length > 0) {
      throw new ConflictException({
        message: 'Файл используется правилами мокирования',
        usedByCount: usedByRules.length,
        usedByRules,
      });
    }

    await this.prisma.mockResponseFile.delete({ where: { id: fileId } });
    await removeMockResponseFile(this.getUploadsDir(), file.storagePath);
  }

  private async findOwnedFileOrFail(
    userId: number,
    mockServerId: number,
    fileId: number,
  ): Promise<MockResponseFile> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const file = await this.prisma.mockResponseFile.findFirst({
      where: { id: fileId, mockServerId },
    });
    if (!file) {
      throw new NotFoundException('Файл ответа не найден');
    }
    return file;
  }

  private getUploadsDir(): string {
    return this.configService.get<string>('app.uploadsDir', 'uploads');
  }

  private toMeta(file: MockResponseFile): MockResponseFileMetaDto {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
