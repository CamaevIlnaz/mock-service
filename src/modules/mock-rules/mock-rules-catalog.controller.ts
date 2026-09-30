import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
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
import { CopyMockRuleDto } from './dto/copy-mock-rule.dto';
import { ListMockRulesQueryDto } from './dto/list-mock-rules-query.dto';
import { MockRuleResponseDto } from './dto/mock-rule-response.dto';
import { PaginatedCatalogMockRulesResponseDto } from './dto/paginated-catalog-mock-rules-response.dto';
import { MockRulesService } from './mock-rules.service';

@ApiTags('mock-rules')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('mock-rules')
export class MockRulesCatalogController {
  constructor(private readonly mockRulesService: MockRulesService) {}

  @Get()
  @ApiOperation({
    summary: 'Каталог правил мокирования всех пользователей',
    description:
      'Пагинация, поиск по названию/URL, фильтры по method и isEnabled. Сортировка по createdAt desc.',
  })
  @ApiOkResponse({ type: PaginatedCatalogMockRulesResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные query-параметры' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  findAllCatalog(
    @Query() query: ListMockRulesQueryDto,
  ): Promise<PaginatedCatalogMockRulesResponseDto> {
    return this.mockRulesService.findAllCatalog(query);
  }

  @Post(':id/copy')
  @ApiOperation({
    summary: 'Скопировать правило мокирования себе',
    description:
      'Создаёт полную копию правила (включая файл ответа) на целевом мок-сервере текущего пользователя',
  })
  @ApiParam({ name: 'id', description: 'ID исходного правила', type: Number })
  @ApiCreatedResponse({ type: MockRuleResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiNotFoundResponse({ description: 'Правило или мок-сервер не найден' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  copyById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyMockRuleDto,
  ): Promise<MockRuleResponseDto> {
    return this.mockRulesService.copyById(user.sub, id, dto.targetMockServerId);
  }
}
