import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MockResponseFile,
  MockResponseType,
  MockRule,
  Prisma,
} from '@prisma/client';
import type { MockResponseUpload } from '../../common/utils/mock-response-storage';
import {
  copyMockResponseFile,
  removeMockResponseFile,
  saveMockResponseFile,
} from '../../common/utils/mock-response-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { MockServersService } from '../mock-servers/mock-servers.service';
import { MockResponseFileMetaDto } from '../mock-response-files/dto/mock-response-file-meta.dto';
import { CreateMockRuleDto } from './dto/create-mock-rule.dto';
import { ListMockRulesQueryDto } from './dto/list-mock-rules-query.dto';
import { MockRuleResponseDto } from './dto/mock-rule-response.dto';
import { PaginatedMockRulesResponseDto } from './dto/paginated-mock-rules-response.dto';
import { UpdateMockRuleDto } from './dto/update-mock-rule.dto';

type RuleWithFile = MockRule & {
  responseFile: MockResponseFile | null;
};

@Injectable()
export class MockRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockServersService: MockServersService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    userId: number,
    mockServerId: number,
    query: ListMockRulesQueryDto,
  ): Promise<PaginatedMockRulesResponseDto> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { mockServerId };

    const [total, rules] = await this.prisma.$transaction([
      this.prisma.mockRule.count({ where }),
      this.prisma.mockRule.findMany({
        where,
        include: { responseFile: true },
        orderBy: { priority: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rules.map((rule) => this.toResponse(rule)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(
    userId: number,
    mockServerId: number,
    id: number,
  ): Promise<MockRuleResponseDto> {
    const rule = await this.findOwnedRuleOrFail(userId, mockServerId, id);
    return this.toResponse(rule);
  }

  async create(
    userId: number,
    mockServerId: number,
    dto: CreateMockRuleDto,
    file?: MockResponseUpload,
  ): Promise<MockRuleResponseDto> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);
    this.assertCreateConsistency(dto, file);

    const priority =
      dto.priority !== undefined
        ? dto.priority
        : await this.nextPriority(mockServerId);

    if (file) {
      return this.createWithNewFile(mockServerId, dto, file, priority);
    }

    if (dto.responseType === MockResponseType.FILE && dto.responseFileId) {
      await this.ensureFileOnServer(mockServerId, dto.responseFileId);
    }

    const rule = await this.prisma.mockRule.create({
      data: {
        mockServerId,
        name: dto.name.trim(),
        method: dto.method,
        urlMask: dto.urlMask.trim(),
        isEnabled: dto.isEnabled ?? true,
        priority,
        statusCode: dto.statusCode ?? 200,
        delayMs: dto.delayMs ?? 0,
        responseType: dto.responseType,
        responseBody:
          dto.responseType === MockResponseType.INLINE_JSON
            ? (dto.responseBody as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        responseFileId:
          dto.responseType === MockResponseType.FILE
            ? dto.responseFileId!
            : null,
        responseHeaders: dto.responseHeaders
          ? (dto.responseHeaders as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: { responseFile: true },
    });

    return this.toResponse(rule);
  }

  async update(
    userId: number,
    mockServerId: number,
    id: number,
    dto: UpdateMockRuleDto,
    file?: MockResponseUpload,
  ): Promise<MockRuleResponseDto> {
    const existing = await this.findOwnedRuleOrFail(userId, mockServerId, id);
    const nextType = dto.responseType ?? existing.responseType;
    this.assertUpdateConsistency(dto, nextType, file, existing);

    if (file) {
      return this.updateWithNewFile(existing, dto, file, nextType);
    }

    if (
      nextType === MockResponseType.FILE &&
      dto.responseFileId !== undefined &&
      dto.responseFileId !== null
    ) {
      await this.ensureFileOnServer(mockServerId, dto.responseFileId);
    }

    const data: Prisma.MockRuleUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.method !== undefined) {
      data.method = dto.method;
    }
    if (dto.urlMask !== undefined) {
      data.urlMask = dto.urlMask.trim();
    }
    if (dto.isEnabled !== undefined) {
      data.isEnabled = dto.isEnabled;
    }
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }
    if (dto.statusCode !== undefined) {
      data.statusCode = dto.statusCode;
    }
    if (dto.delayMs !== undefined) {
      data.delayMs = dto.delayMs;
    }
    if (dto.responseHeaders !== undefined) {
      data.responseHeaders = dto.responseHeaders
        ? dto.responseHeaders
        : Prisma.JsonNull;
    }

    if (
      dto.responseType !== undefined ||
      dto.responseBody !== undefined ||
      dto.responseFileId !== undefined
    ) {
      data.responseType = nextType;

      if (nextType === MockResponseType.INLINE_JSON) {
        data.responseBody =
          dto.responseBody !== undefined
            ? (dto.responseBody as Prisma.InputJsonValue)
            : (existing.responseBody as Prisma.InputJsonValue);
        data.responseFile = { disconnect: true };
      } else {
        data.responseBody = Prisma.JsonNull;
        const fileId =
          dto.responseFileId !== undefined
            ? dto.responseFileId
            : existing.responseFileId;
        if (!fileId) {
          throw new BadRequestException(
            'Для responseType FILE нужен responseFileId или новый файл',
          );
        }
        data.responseFile = { connect: { id: fileId } };
      }
    }

    const rule = await this.prisma.mockRule.update({
      where: { id },
      data,
      include: { responseFile: true },
    });

    return this.toResponse(rule);
  }

  async remove(
    userId: number,
    mockServerId: number,
    id: number,
  ): Promise<void> {
    await this.findOwnedRuleOrFail(userId, mockServerId, id);
    await this.prisma.mockRule.delete({ where: { id } });
  }

  async copy(
    userId: number,
    sourceMockServerId: number,
    ruleId: number,
    targetMockServerId: number,
  ): Promise<MockRuleResponseDto> {
    const sourceRule = await this.findOwnedRuleOrFail(
      userId,
      sourceMockServerId,
      ruleId,
    );
    await this.mockServersService.findOwnedOrFail(userId, targetMockServerId);

    const priority = await this.nextPriority(targetMockServerId);
    const sameServer = sourceMockServerId === targetMockServerId;

    if (
      sourceRule.responseType === MockResponseType.FILE &&
      sourceRule.responseFileId &&
      !sameServer
    ) {
      return this.copyRuleWithFileCopy(
        sourceRule,
        targetMockServerId,
        priority,
      );
    }

    const rule = await this.prisma.mockRule.create({
      data: {
        mockServerId: targetMockServerId,
        name: sourceRule.name,
        method: sourceRule.method,
        urlMask: sourceRule.urlMask,
        isEnabled: sourceRule.isEnabled,
        priority,
        statusCode: sourceRule.statusCode,
        delayMs: sourceRule.delayMs,
        responseType: sourceRule.responseType,
        responseBody:
          sourceRule.responseBody === null
            ? Prisma.JsonNull
            : (sourceRule.responseBody as Prisma.InputJsonValue),
        responseFileId: sameServer ? sourceRule.responseFileId : null,
        responseHeaders:
          sourceRule.responseHeaders === null
            ? Prisma.JsonNull
            : (sourceRule.responseHeaders as Prisma.InputJsonValue),
      },
      include: { responseFile: true },
    });

    return this.toResponse(rule);
  }

  private async copyRuleWithFileCopy(
    sourceRule: RuleWithFile,
    targetMockServerId: number,
    priority: number,
  ): Promise<MockRuleResponseDto> {
    if (!sourceRule.responseFile) {
      throw new BadRequestException(
        'У правила указан файл ответа, но запись файла не найдена',
      );
    }

    const uploadsDir = this.getUploadsDir();
    let copiedStoragePath: string | undefined;

    try {
      const copied = await copyMockResponseFile(
        uploadsDir,
        sourceRule.responseFile.storagePath,
        targetMockServerId,
        sourceRule.responseFile.mimeType,
      );
      copiedStoragePath = copied.storagePath;

      const rule = await this.prisma.$transaction(async (tx) => {
        const newFile = await tx.mockResponseFile.create({
          data: {
            mockServerId: targetMockServerId,
            originalName: sourceRule.responseFile!.originalName,
            mimeType: sourceRule.responseFile!.mimeType,
            sizeBytes: sourceRule.responseFile!.sizeBytes,
            storagePath: copied.storagePath,
          },
        });

        return tx.mockRule.create({
          data: {
            mockServerId: targetMockServerId,
            name: sourceRule.name,
            method: sourceRule.method,
            urlMask: sourceRule.urlMask,
            isEnabled: sourceRule.isEnabled,
            priority,
            statusCode: sourceRule.statusCode,
            delayMs: sourceRule.delayMs,
            responseType: MockResponseType.FILE,
            responseBody: Prisma.JsonNull,
            responseFileId: newFile.id,
            responseHeaders:
              sourceRule.responseHeaders === null
                ? Prisma.JsonNull
                : (sourceRule.responseHeaders as Prisma.InputJsonValue),
          },
          include: { responseFile: true },
        });
      });

      return this.toResponse(rule);
    } catch (error) {
      if (copiedStoragePath) {
        await removeMockResponseFile(uploadsDir, copiedStoragePath);
      }
      throw error;
    }
  }

  private async createWithNewFile(
    mockServerId: number,
    dto: CreateMockRuleDto,
    file: MockResponseUpload,
    priority: number,
  ): Promise<MockRuleResponseDto> {
    const uploadsDir = this.getUploadsDir();
    let savedPath: string | undefined;

    try {
      const saved = await saveMockResponseFile(uploadsDir, mockServerId, file);
      savedPath = saved.storagePath;

      const rule = await this.prisma.$transaction(async (tx) => {
        const responseFile = await tx.mockResponseFile.create({
          data: {
            mockServerId,
            originalName: file.originalName,
            mimeType: file.mimetype,
            sizeBytes: saved.sizeBytes,
            storagePath: saved.storagePath,
          },
        });

        return tx.mockRule.create({
          data: {
            mockServerId,
            name: dto.name.trim(),
            method: dto.method,
            urlMask: dto.urlMask.trim(),
            isEnabled: dto.isEnabled ?? true,
            priority,
            statusCode: dto.statusCode ?? 200,
            delayMs: dto.delayMs ?? 0,
            responseType: MockResponseType.FILE,
            responseBody: Prisma.JsonNull,
            responseFileId: responseFile.id,
            responseHeaders: dto.responseHeaders
              ? (dto.responseHeaders as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
          include: { responseFile: true },
        });
      });

      return this.toResponse(rule);
    } catch (error) {
      if (savedPath) {
        await removeMockResponseFile(uploadsDir, savedPath);
      }
      throw error;
    }
  }

  private async updateWithNewFile(
    existing: RuleWithFile,
    dto: UpdateMockRuleDto,
    file: MockResponseUpload,
    nextType: MockResponseType,
  ): Promise<MockRuleResponseDto> {
    if (nextType !== MockResponseType.FILE) {
      throw new BadRequestException(
        'Новый файл можно загружать только при responseType FILE',
      );
    }

    const uploadsDir = this.getUploadsDir();
    let savedPath: string | undefined;

    try {
      const saved = await saveMockResponseFile(
        uploadsDir,
        existing.mockServerId,
        file,
      );
      savedPath = saved.storagePath;

      const rule = await this.prisma.$transaction(async (tx) => {
        const responseFile = await tx.mockResponseFile.create({
          data: {
            mockServerId: existing.mockServerId,
            originalName: file.originalName,
            mimeType: file.mimetype,
            sizeBytes: saved.sizeBytes,
            storagePath: saved.storagePath,
          },
        });

        return tx.mockRule.update({
          where: { id: existing.id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.method !== undefined ? { method: dto.method } : {}),
            ...(dto.urlMask !== undefined
              ? { urlMask: dto.urlMask.trim() }
              : {}),
            ...(dto.isEnabled !== undefined
              ? { isEnabled: dto.isEnabled }
              : {}),
            ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
            ...(dto.statusCode !== undefined
              ? { statusCode: dto.statusCode }
              : {}),
            ...(dto.delayMs !== undefined ? { delayMs: dto.delayMs } : {}),
            ...(dto.responseHeaders !== undefined
              ? {
                  responseHeaders: dto.responseHeaders
                    ? (dto.responseHeaders as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                }
              : {}),
            responseType: MockResponseType.FILE,
            responseBody: Prisma.JsonNull,
            responseFileId: responseFile.id,
          },
          include: { responseFile: true },
        });
      });

      return this.toResponse(rule);
    } catch (error) {
      if (savedPath) {
        await removeMockResponseFile(uploadsDir, savedPath);
      }
      throw error;
    }
  }

  private assertCreateConsistency(
    dto: CreateMockRuleDto,
    file?: MockResponseUpload,
  ): void {
    const hasFileUpload = Boolean(file);
    const hasFileId = Boolean(dto.responseFileId);
    const hasBody = dto.responseBody !== undefined && dto.responseBody !== null;

    if (hasFileUpload && hasFileId) {
      throw new BadRequestException(
        'Нельзя одновременно указать responseFileId и загружать новый файл',
      );
    }

    if (hasBody && (hasFileUpload || hasFileId)) {
      throw new BadRequestException(
        'Нельзя одновременно указать responseBody и файл ответа',
      );
    }

    if (dto.responseType === MockResponseType.INLINE_JSON) {
      if (hasFileUpload || hasFileId) {
        throw new BadRequestException(
          'Для INLINE_JSON нельзя указывать файл ответа',
        );
      }
      if (!hasBody) {
        throw new BadRequestException(
          'Для INLINE_JSON поле responseBody обязательно',
        );
      }
      return;
    }

    if (!hasFileUpload && !hasFileId) {
      throw new BadRequestException(
        'Для FILE нужен responseFileId или новый файл в multipart',
      );
    }
  }

  private assertUpdateConsistency(
    dto: UpdateMockRuleDto,
    nextType: MockResponseType,
    file: MockResponseUpload | undefined,
    existing: RuleWithFile,
  ): void {
    const hasFileUpload = Boolean(file);
    const hasFileId =
      dto.responseFileId !== undefined && dto.responseFileId !== null;
    const hasBody = dto.responseBody !== undefined && dto.responseBody !== null;

    if (hasFileUpload && hasFileId) {
      throw new BadRequestException(
        'Нельзя одновременно указать responseFileId и загружать новый файл',
      );
    }

    if (hasBody && (hasFileUpload || hasFileId)) {
      throw new BadRequestException(
        'Нельзя одновременно указать responseBody и файл ответа',
      );
    }

    if (nextType === MockResponseType.INLINE_JSON) {
      if (hasFileUpload || hasFileId) {
        throw new BadRequestException(
          'Для INLINE_JSON нельзя указывать файл ответа',
        );
      }
      const switchingToInline =
        dto.responseType === MockResponseType.INLINE_JSON &&
        existing.responseType !== MockResponseType.INLINE_JSON;
      if (switchingToInline && !hasBody) {
        throw new BadRequestException(
          'Для INLINE_JSON поле responseBody обязательно',
        );
      }
      return;
    }

    const effectiveFileId =
      dto.responseFileId !== undefined
        ? dto.responseFileId
        : existing.responseFileId;

    if (!hasFileUpload && !effectiveFileId) {
      throw new BadRequestException(
        'Для FILE нужен responseFileId или новый файл в multipart',
      );
    }
  }

  private async ensureFileOnServer(
    mockServerId: number,
    responseFileId: number,
  ): Promise<MockResponseFile> {
    const file = await this.prisma.mockResponseFile.findFirst({
      where: { id: responseFileId, mockServerId },
    });
    if (!file) {
      throw new BadRequestException(
        'Файл ответа не найден на этом мок-сервере',
      );
    }
    return file;
  }

  private async findOwnedRuleOrFail(
    userId: number,
    mockServerId: number,
    id: number,
  ): Promise<RuleWithFile> {
    await this.mockServersService.findOwnedOrFail(userId, mockServerId);

    const rule = await this.prisma.mockRule.findFirst({
      where: { id, mockServerId },
      include: { responseFile: true },
    });
    if (!rule) {
      throw new NotFoundException('Правило мокирования не найдено');
    }
    return rule;
  }

  private async nextPriority(mockServerId: number): Promise<number> {
    const maxPriority = await this.prisma.mockRule.aggregate({
      where: { mockServerId },
      _max: { priority: true },
    });
    return maxPriority._max.priority === null
      ? 0
      : maxPriority._max.priority + 1;
  }

  private getUploadsDir(): string {
    return this.configService.get<string>('app.uploadsDir', 'uploads');
  }

  private toResponse(rule: RuleWithFile): MockRuleResponseDto {
    return {
      id: rule.id,
      mockServerId: rule.mockServerId,
      name: rule.name,
      method: rule.method,
      urlMask: rule.urlMask,
      isEnabled: rule.isEnabled,
      priority: rule.priority,
      statusCode: rule.statusCode,
      delayMs: rule.delayMs,
      responseType: rule.responseType,
      responseBody: rule.responseBody,
      responseFileId: rule.responseFileId,
      responseHeaders:
        (rule.responseHeaders as Record<string, string> | null) ?? null,
      responseFile: rule.responseFile
        ? this.toFileMeta(rule.responseFile)
        : null,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private toFileMeta(file: MockResponseFile): MockResponseFileMetaDto {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
    };
  }
}
