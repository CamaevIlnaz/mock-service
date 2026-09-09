import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  JwtAuthGuard,
  type JwtPayload,
} from '../../common/guards/jwt-auth.guard';
import { CreateMockServerDto } from './dto/create-mock-server.dto';
import { MockServerResponseDto } from './dto/mock-server-response.dto';
import { UpdateMockServerDto } from './dto/update-mock-server.dto';
import { MockServersService } from './mock-servers.service';

@ApiTags('mock-servers')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('mock-servers')
export class MockServersController {
  constructor(private readonly mockServersService: MockServersService) {}

  @Get()
  @ApiOperation({ summary: 'Список мок-серверов текущего пользователя' })
  @ApiOkResponse({ type: MockServerResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAll(@CurrentUser() user: JwtPayload): Promise<MockServerResponseDto[]> {
    return this.mockServersService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить мок-сервер по id' })
  @ApiParam({ name: 'id', description: 'ID мок-сервера' })
  @ApiOkResponse({ type: MockServerResponseDto })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<MockServerResponseDto> {
    return this.mockServersService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать мок-сервер' })
  @ApiCreatedResponse({ type: MockServerResponseDto })
  @ApiBadRequestResponse({ description: 'Стенд с таким code не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMockServerDto,
  ): Promise<MockServerResponseDto> {
    return this.mockServersService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить мок-сервер' })
  @ApiParam({ name: 'id', description: 'ID мок-сервера' })
  @ApiOkResponse({ type: MockServerResponseDto })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiBadRequestResponse({ description: 'Стенд с таким code не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMockServerDto,
  ): Promise<MockServerResponseDto> {
    return this.mockServersService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить мок-сервер' })
  @ApiParam({ name: 'id', description: 'ID мок-сервера' })
  @ApiNoContentResponse({ description: 'Мок-сервер удалён' })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.mockServersService.remove(user.sub, id);
  }
}
