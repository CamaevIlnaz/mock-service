import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { MockProxyService } from './mock-proxy.service';
import { splitMockApiUrl } from './url-mask.matcher';

@ApiExcludeController()
@Controller('mockapi')
export class MockProxyController {
  constructor(private readonly mockProxyService: MockProxyService) {}

  @All([':connectionToken', ':connectionToken/*'])
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
