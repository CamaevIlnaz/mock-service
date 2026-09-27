import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  JwtAuthGuard,
  type JwtPayload,
} from '../../common/guards/jwt-auth.guard';
import { MockResponseFileMetaDto } from './dto/mock-response-file-meta.dto';
import { MockResponseFilesService } from './mock-response-files.service';

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
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiOkResponse({ type: MockResponseFileMetaDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
  ): Promise<MockResponseFileMetaDto[]> {
    return this.mockResponseFilesService.findAll(user.sub, mockServerId);
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
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ description: 'Содержимое файла' })
  @ApiNotFoundResponse({ description: 'Файл или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async getContent(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const { stream, mimeType, originalName } =
      await this.mockResponseFilesService.getContent(
        user.sub,
        mockServerId,
        fileId,
      );

    void reply.header('Content-Type', mimeType);
    void reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );

    return stream;
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
}
