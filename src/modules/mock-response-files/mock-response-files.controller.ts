import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  JwtAuthGuard,
  type JwtPayload,
} from '../../common/guards/jwt-auth.guard';
import {
  JSON_MIME_TYPE,
  normalizeMockResponseName,
  resolveMockResponseMimeType,
  type MockResponseUpload,
} from '../../common/utils/mock-response-storage';
import { CopyMockResponseFileDto } from './dto/copy-mock-response-file.dto';
import { ListMockResponseFilesQueryDto } from './dto/list-mock-response-files-query.dto';
import { MockResponseFileMetaDto } from './dto/mock-response-file-meta.dto';
import { PaginatedMockResponseFilesResponseDto } from './dto/paginated-mock-response-files-response.dto';
import { UpdateMockResponseFileDto } from './dto/update-mock-response-file.dto';
import { MockResponseFilesService } from './mock-response-files.service';

const MAX_ORIGINAL_NAME_LENGTH = 255;

@ApiTags('mock-response-files')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('mock-servers/:mockServerId/response-files')
export class MockResponseFilesController {
  constructor(
    private readonly mockResponseFilesService: MockResponseFilesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Список файлов ответов мок-сервера',
    description:
      'Пагинация и поиск по названию файла. Сортировка по дате создания (новые сначала).',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiOkResponse({ type: PaginatedMockResponseFilesResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные query-параметры' })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Query() query: ListMockResponseFilesQueryDto,
  ): Promise<PaginatedMockResponseFilesResponseDto> {
    return this.mockResponseFilesService.findAll(user.sub, mockServerId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Загрузить файл ответа (только JSON или PDF, до 5 МБ)',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл .json или .pdf',
        },
        originalName: {
          type: 'string',
          maxLength: MAX_ORIGINAL_NAME_LENGTH,
          description: 'Название файла. По умолчанию — имя загруженного файла',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: MockResponseFileMetaDto })
  @ApiBadRequestResponse({
    description: 'Нет файла, неподдерживаемый формат или невалидное содержимое',
  })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Req() request: FastifyRequest,
  ): Promise<MockResponseFileMetaDto> {
    if (!request.isMultipart()) {
      throw new BadRequestException('Ожидается multipart/form-data');
    }

    const { file, originalName } = await this.parseMultipart(request);
    if (!file) {
      throw new BadRequestException('Поле file обязательно');
    }

    const mimetype = resolveMockResponseMimeType(
      file.mimetype,
      file.originalName,
    );

    return this.mockResponseFilesService.upload(user.sub, mockServerId, {
      buffer: file.buffer,
      mimetype,
      originalName: normalizeMockResponseName(
        originalName ?? file.originalName,
        mimetype,
      ),
    });
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Получить метаданные файла ответа' })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiOkResponse({ type: MockResponseFileMetaDto })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ): Promise<MockResponseFileMetaDto> {
    return this.mockResponseFilesService.findOne(
      user.sub,
      mockServerId,
      fileId,
    );
  }

  @Patch(':fileId')
  @ApiOperation({
    summary: 'Переименовать файл ответа (оригинальное название)',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiOkResponse({ type: MockResponseFileMetaDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Body() dto: UpdateMockResponseFileDto,
  ): Promise<MockResponseFileMetaDto> {
    return this.mockResponseFilesService.rename(
      user.sub,
      mockServerId,
      fileId,
      dto,
    );
  }

  @Post(':fileId/copy')
  @ApiOperation({
    summary: 'Создать копию файла ответа',
    description:
      'Копия создаётся в текущем или другом мок-сервере пользователя (targetMockServerId).',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID исходного мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiCreatedResponse({ type: MockResponseFileMetaDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({
    description: 'Файл, исходный или целевой мок-сервер не найден',
  })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  copy(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Body() dto: CopyMockResponseFileDto,
  ): Promise<MockResponseFileMetaDto> {
    return this.mockResponseFilesService.copy(
      user.sub,
      mockServerId,
      fileId,
      dto,
    );
  }

  @Get(':fileId/content')
  @ApiOperation({
    summary: 'Скачать содержимое файла ответа (JWT + ownership)',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiProduces('application/json', 'application/pdf')
  @ApiOkResponse({ description: 'Содержимое файла' })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  getContent(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ): Promise<StreamableFile> {
    return this.mockResponseFilesService.getContent(
      user.sub,
      mockServerId,
      fileId,
    );
  }

  @Put(':fileId/content')
  @ApiOperation({
    summary: 'Заменить содержимое JSON-файла ответа',
    description:
      'Только для JSON-файлов (PDF редактировать нельзя). Тело — сам JSON (application/json) ' +
      'или multipart с полем file. Изменение сразу применяется ко всем правилам, использующим файл.',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    description:
      'application/json — новое содержимое файла; multipart — поле file с .json',
    schema: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: true,
          example: { items: [{ id: 1, name: 'Product' }] },
        },
        {
          type: 'object',
          required: ['file'],
          properties: { file: { type: 'string', format: 'binary' } },
        },
      ],
    },
  })
  @ApiOkResponse({ type: MockResponseFileMetaDto })
  @ApiBadRequestResponse({
    description: 'Файл не JSON, невалидный JSON или пустое содержимое',
  })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async updateContent(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Req() request: FastifyRequest,
  ): Promise<MockResponseFileMetaDto> {
    const content = await this.readJsonContent(request);
    return this.mockResponseFilesService.updateContent(
      user.sub,
      mockServerId,
      fileId,
      content,
    );
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить файл ответа (запрещено, если используется правилами)',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'fileId', description: 'ID файла', type: Number })
  @ApiNoContentResponse({ description: 'Файл удалён' })
  @ApiConflictResponse({
    description: 'Файл используется правилами',
  })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ): Promise<void> {
    await this.mockResponseFilesService.remove(user.sub, mockServerId, fileId);
  }

  private async parseMultipart(
    request: FastifyRequest,
  ): Promise<{ file?: MockResponseUpload; originalName?: string }> {
    let file: MockResponseUpload | undefined;
    let originalName: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'file' && buffer.byteLength > 0) {
          file = {
            buffer,
            mimetype: part.mimetype,
            originalName: part.filename || 'response',
          };
        }
      } else if (part.fieldname === 'originalName') {
        const value = String(part.value).trim();
        if (value) {
          originalName = value;
        }
      }
    }

    if (
      originalName !== undefined &&
      originalName.length > MAX_ORIGINAL_NAME_LENGTH
    ) {
      throw new BadRequestException(
        `originalName не должен быть длиннее ${MAX_ORIGINAL_NAME_LENGTH} символов`,
      );
    }

    return { file, originalName };
  }

  private async readJsonContent(request: FastifyRequest): Promise<Buffer> {
    if (request.isMultipart()) {
      const { file } = await this.parseMultipart(request);
      if (!file) {
        throw new BadRequestException('Поле file обязательно');
      }
      const mimetype = resolveMockResponseMimeType(
        file.mimetype,
        file.originalName,
      );
      if (mimetype !== JSON_MIME_TYPE) {
        throw new BadRequestException('Новое содержимое должно быть JSON');
      }
      return file.buffer;
    }

    if (Buffer.isBuffer(request.body)) {
      return request.body;
    }

    if (typeof request.body === 'string') {
      return Buffer.from(request.body, 'utf8');
    }

    if (request.body === undefined) {
      throw new BadRequestException('Тело запроса пусто');
    }

    return Buffer.from(JSON.stringify(request.body, null, 2), 'utf8');
  }
}
