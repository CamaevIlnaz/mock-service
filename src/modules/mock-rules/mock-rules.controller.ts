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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  JwtAuthGuard,
  type JwtPayload,
} from '../../common/guards/jwt-auth.guard';
import type { MockResponseUpload } from '../../common/utils/mock-response-storage';
import { CopyMockRuleDto } from './dto/copy-mock-rule.dto';
import { CreateMockRuleDto } from './dto/create-mock-rule.dto';
import { MockRuleResponseDto } from './dto/mock-rule-response.dto';
import { UpdateMockRuleDto } from './dto/update-mock-rule.dto';
import { MockRulesService } from './mock-rules.service';

@ApiTags('mock-rules')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(CreateMockRuleDto, UpdateMockRuleDto)
@Controller('mock-servers/:mockServerId/rules')
export class MockRulesController {
  constructor(private readonly mockRulesService: MockRulesService) {}

  @Get()
  @ApiOperation({ summary: 'Список правил мокирования мок-сервера' })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiOkResponse({ type: MockRuleResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
  ): Promise<MockRuleResponseDto[]> {
    return this.mockRulesService.findAll(user.sub, mockServerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить правило мокирования по id' })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'id', description: 'ID правила', type: Number })
  @ApiOkResponse({ type: MockRuleResponseDto })
  @ApiNotFoundResponse({ description: 'Правило или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MockRuleResponseDto> {
    return this.mockRulesService.findOne(user.sub, mockServerId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Создать правило мокирования',
    description:
      'JSON для INLINE_JSON или FILE с существующим responseFileId; multipart (data+file) для нового файла',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    description:
      'application/json — CreateMockRuleDto; multipart — поле data (JSON) и опционально file',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CreateMockRuleDto' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: { type: 'string', description: 'JSON CreateMockRuleDto' },
            file: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @ApiCreatedResponse({ type: MockRuleResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Req() request: FastifyRequest,
  ): Promise<MockRuleResponseDto> {
    const { dto, file } = await this.parseRuleRequest(
      request,
      CreateMockRuleDto,
    );
    return this.mockRulesService.create(user.sub, mockServerId, dto, file);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Обновить правило мокирования',
    description:
      'JSON или multipart (data+file) при загрузке нового файла ответа',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'id', description: 'ID правила', type: Number })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/UpdateMockRuleDto' },
        {
          type: 'object',
          required: ['data'],
          properties: {
            data: { type: 'string', description: 'JSON UpdateMockRuleDto' },
            file: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @ApiOkResponse({ type: MockRuleResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({ description: 'Правило или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: FastifyRequest,
  ): Promise<MockRuleResponseDto> {
    const { dto, file } = await this.parseRuleRequest(
      request,
      UpdateMockRuleDto,
    );
    return this.mockRulesService.update(user.sub, mockServerId, id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить правило мокирования (файл ответа не удаляется)',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'id', description: 'ID правила', type: Number })
  @ApiNoContentResponse({ description: 'Правило удалено' })
  @ApiNotFoundResponse({ description: 'Правило или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.mockRulesService.remove(user.sub, mockServerId, id);
  }

  @Post(':id/copy')
  @ApiOperation({
    summary: 'Скопировать правило в мок-сервер текущего пользователя',
  })
  @ApiParam({
    name: 'mockServerId',
    description: 'ID исходного мок-сервера',
    type: Number,
  })
  @ApiParam({ name: 'id', description: 'ID правила', type: Number })
  @ApiCreatedResponse({ type: MockRuleResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({ description: 'Правило или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  copy(
    @CurrentUser() user: JwtPayload,
    @Param('mockServerId', ParseIntPipe) mockServerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyMockRuleDto,
  ): Promise<MockRuleResponseDto> {
    return this.mockRulesService.copy(
      user.sub,
      mockServerId,
      id,
      dto.targetMockServerId,
    );
  }

  private async parseRuleRequest<T extends object>(
    request: FastifyRequest,
    DtoClass: new () => T,
  ): Promise<{ dto: T; file?: MockResponseUpload }> {
    if (request.isMultipart()) {
      let dataRaw: string | undefined;
      let file: MockResponseUpload | undefined;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'file') {
            const buffer = await part.toBuffer();
            if (buffer.byteLength > 0) {
              file = {
                buffer,
                mimetype: part.mimetype,
                originalName: part.filename || 'response.bin',
              };
            }
          } else {
            await part.toBuffer();
          }
        } else if (part.fieldname === 'data') {
          dataRaw = String(part.value);
        }
      }

      if (!dataRaw) {
        throw new BadRequestException('Поле data обязательно для multipart');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(dataRaw) as unknown;
      } catch {
        throw new BadRequestException('Поле data должно быть валидным JSON');
      }

      return {
        dto: await this.validateDto(DtoClass, parsed),
        file,
      };
    }

    return {
      dto: await this.validateDto(DtoClass, request.body),
    };
  }

  private async validateDto<T extends object>(
    DtoClass: new () => T,
    payload: unknown,
  ): Promise<T> {
    const dto = plainToInstance(DtoClass, payload);
    const errors = await validate(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        error.constraints ? Object.values(error.constraints) : [],
      );
      throw new BadRequestException(
        messages.length > 0 ? messages : 'Некорректные данные',
      );
    }
    return dto;
  }
}
