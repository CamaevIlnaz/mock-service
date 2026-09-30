import { All, Controller, Param, Req, Res } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { MockProxyService } from './mock-proxy.service';
import { splitMockApiUrl } from './url-mask.matcher';

@ApiTags('mock-proxy')
@Controller('mockapi')
export class MockProxyController {
  constructor(private readonly mockProxyService: MockProxyService) {}

  @All([':connectionToken', ':connectionToken/*'])
  @ApiOperation({
    summary: 'Mock proxy: ответ по правилу или проксирование на стенд',
    description:
      'Путь после connectionToken сопоставляется с urlMask включённых правил мок-сервера (по priority). ' +
      'Если правило не найдено, запрос уходит на {stand.domain}{stand.basePath}{путь}?query. ' +
      'JWT не требуется. Заголовок X-Mocked-By показывает источник ответа.',
  })
  @ApiParam({
    name: 'connectionToken',
    description: 'Токен подключения мок-сервера',
    type: String,
  })
  @ApiOkResponse({ description: 'Ответ правила или стенда' })
  @ApiNotFoundResponse({ description: 'Мок-сервер не найден' })
  @ApiBadGatewayResponse({ description: 'Стенд недоступен или некорректен' })
  @ApiGatewayTimeoutResponse({ description: 'Стенд не ответил вовремя' })
  async handle(
    @Param('connectionToken') connectionToken: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { path, search } = splitMockApiUrl(request.url);

    const result = await this.mockProxyService.handle({
      connectionToken,
      method: request.method,
      path,
      search,
      headers: request.headers,
      body: this.extractBody(request),
    });

    await reply
      .status(result.statusCode)
      .headers(result.headers)
      .send(result.body ?? '');
  }

  private extractBody(request: FastifyRequest): Buffer | Readable | undefined {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return undefined;
    }

    const body: unknown = request.body;
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (typeof body === 'string') {
      return Buffer.from(body);
    }
    if (request.isMultipart()) {
      return request.raw;
    }

    return undefined;
  }
}
