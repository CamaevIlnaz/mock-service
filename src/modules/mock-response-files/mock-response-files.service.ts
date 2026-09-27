import {
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import {
  readMockResponseFile,
  removeMockResponseFile,
} from '../../common/utils/mock-response-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { MockServersService } from '../mock-servers/mock-servers.service';
import { MockResponseFileMetaDto } from './dto/mock-response-file-meta.dto';

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
  ): Promise<MockResponseFileMetaDto[]> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const files = await this.prisma.mockResponseFile.findMany({
      where: { mockServerId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
    }));
  }

  async getContent(
    userId: number,
    mockServerId: number,
    fileId: number,
  ): Promise<{
    stream: StreamableFile;
    mimeType: string;
    originalName: string;
  }> {
    const file = await this.findOwnedFileOrFail(userId, mockServerId, fileId);
    const uploadsDir = this.configService.get<string>(
      'app.uploadsDir',
      'uploads',
    );

    // Проверяем, что файл читается, до отдачи stream
    await readMockResponseFile(uploadsDir, file.storagePath);

    const stream = new StreamableFile(
      createReadStream(join(uploadsDir, file.storagePath)),
      {
        type: file.mimeType,
        disposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      },
    );

    return {
      stream,
      mimeType: file.mimeType,
      originalName: file.originalName,
    };
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

    const uploadsDir = this.configService.get<string>(
      'app.uploadsDir',
      'uploads',
    );
    await removeMockResponseFile(uploadsDir, file.storagePath);
  }

  private async findOwnedFileOrFail(
    userId: number,
    mockServerId: number,
    fileId: number,
  ) {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const file = await this.prisma.mockResponseFile.findFirst({
      where: { id: fileId, mockServerId },
    });
    if (!file) {
      throw new NotFoundException('Файл ответа не найден');
    }
    return file;
  }
}
