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
  ApiConflictResponse,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateStandDto } from './dto/create-stand.dto';
import { StandResponseDto } from './dto/stand-response.dto';
import { UpdateStandDto } from './dto/update-stand.dto';
import { StandsService } from './stands.service';

@ApiTags('stands')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('stands')
export class StandsController {
  constructor(private readonly standsService: StandsService) {}

  @Get()
  @ApiOperation({ summary: 'Список стендов' })
  @ApiOkResponse({ type: StandResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAll(): Promise<StandResponseDto[]> {
    return this.standsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить стенд по id' })
  @ApiParam({ name: 'id', description: 'ID стенда' })
  @ApiOkResponse({ type: StandResponseDto })
  @ApiNotFoundResponse({ description: 'Стенд не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findOne(@Param('id') id: string): Promise<StandResponseDto> {
    return this.standsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать стенд' })
  @ApiCreatedResponse({ type: StandResponseDto })
  @ApiConflictResponse({ description: 'Стенд с таким code уже существует' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  create(@Body() dto: CreateStandDto): Promise<StandResponseDto> {
    return this.standsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить стенд' })
  @ApiParam({ name: 'id', description: 'ID стенда' })
  @ApiOkResponse({ type: StandResponseDto })
  @ApiNotFoundResponse({ description: 'Стенд не найден' })
  @ApiConflictResponse({ description: 'Стенд с таким code уже существует' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStandDto,
  ): Promise<StandResponseDto> {
    return this.standsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить стенд' })
  @ApiParam({ name: 'id', description: 'ID стенда' })
  @ApiNoContentResponse({ description: 'Стенд удалён' })
  @ApiNotFoundResponse({ description: 'Стенд не найден' })
  @ApiConflictResponse({
    description: 'Нельзя удалить стенд: к нему привязаны мок-серверы',
  })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.standsService.remove(id);
  }
}
