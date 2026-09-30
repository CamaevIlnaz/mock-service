import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HttpMethod,
  MockResponseFile,
  MockResponseType,
  MockRule,
  Stand,
} from '@prisma/client';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { joinUrl, matchUrlMask } from './url-mask.matcher';

const PROXY_TIMEOUT_MS = 30_000;

const SKIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'content-length',
  'accept-encoding',
  'upgrade',
  'te',
  'trailer',
  'expect',
]);

const SKIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);

type RuleWithFile = MockRule & { responseFile: MockResponseFile | null };

export type MockProxyRequest = {
  connectionToken: string;
  method: string;
  path: string;
  search: string;
  headers: IncomingHttpHeaders;
  body?: Buffer | Readable;
};

export type MockProxyResponse = {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body?: Buffer | string | Readable;
};

@Injectable()
export class MockProxyService {
  private readonly logger = new Logger(MockProxyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async handle(request: MockProxyRequest): Promise<MockProxyResponse> {
    const server = await this.prisma.mockServer.findUnique({
      where: { connectionToken: request.connectionToken },
      include: { stand: true },
    });
    if (!server) {
      throw new NotFoundException('Мок-сервер не найден');
    }

    const rule = await this.findMatchingRule(
      server.id,
      request.method,
      request.path,
    );
    if (rule) {
      return this.buildMockResponse(rule);
    }

    return this.forward(server.stand, request);
  }

  private async findMatchingRule(
    mockServerId: number,
    method: string,
    path: string,
  ): Promise<RuleWithFile | null> {
    const upperMethod = method.toUpperCase();
    if (!Object.values(HttpMethod).includes(upperMethod as HttpMethod)) {
      return null;
    }

    const rules = await this.prisma.mockRule.findMany({
      where: {
        mockServerId,
        isEnabled: true,
        method: upperMethod as HttpMethod,
      },
      include: { responseFile: true },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });

    return rules.find((rule) => matchUrlMask(rule.urlMask, path)) ?? null;
  }

  private async buildMockResponse(
    rule: RuleWithFile,
  ): Promise<MockProxyResponse> {
    if (rule.delayMs > 0) {
      await sleep(rule.delayMs);
    }

    const headers: Record<string, string | string[]> = {
      'x-mocked-by': 'smart-mock-proxy',
    };
    let body: MockProxyResponse['body'];

    if (rule.responseType === MockResponseType.FILE) {
      const file = rule.responseFile;
      if (!file) {
        throw new InternalServerErrorException(
          'У правила не найден файл ответа',
        );
      }

      const absolutePath = join(this.getUploadsDir(), file.storagePath);
      try {
        await stat(absolutePath);
      } catch {
        throw new InternalServerErrorException(
          'Файл ответа не найден на диске',
        );
      }

      headers['content-type'] = file.mimeType;
      body = createReadStream(absolutePath);
    } else {
      headers['content-type'] = 'application/json; charset=utf-8';
      body = JSON.stringify(rule.responseBody ?? null);
    }

    const customHeaders = rule.responseHeaders as Record<string, string> | null;
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        headers[key.toLowerCase()] = String(value);
      }
    }

    return { statusCode: rule.statusCode, headers, body };
  }

  private async forward(
    stand: Stand,
    request: MockProxyRequest,
  ): Promise<MockProxyResponse> {
    let target: string;
    try {
      target = joinUrl(
        stand.domain,
        stand.basePath,
        request.path,
        request.search,
      );
    } catch {
      throw new BadGatewayException(
        `Некорректный адрес стенда: ${stand.domain}`,
      );
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined || SKIPPED_REQUEST_HEADERS.has(key)) {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else {
        headers.set(key, value);
      }
    }

    const method = request.method.toUpperCase();
    const hasBody =
      method !== 'GET' && method !== 'HEAD' && request.body !== undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    const init: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      redirect: 'manual',
      signal: controller.signal,
    };
    if (hasBody) {
      init.body = request.body as unknown as BodyInit;
      init.duplex = 'half';
    }

    let response: Response;
    try {
      response = await fetch(target, init);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new GatewayTimeoutException(
          `Стенд не ответил за ${PROXY_TIMEOUT_MS / 1000} с`,
        );
      }
      this.logger.warn(
        `Ошибка проксирования ${method} ${target}: ${(error as Error).message}`,
      );
      throw new BadGatewayException('Стенд недоступен');
    } finally {
      clearTimeout(timer);
    }

    const responseHeaders: Record<string, string | string[]> = {};
    response.headers.forEach((value, key) => {
      if (!SKIPPED_RESPONSE_HEADERS.has(key)) {
        responseHeaders[key] = value;
      }
    });
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length > 0) {
      responseHeaders['set-cookie'] = setCookie;
    }
    responseHeaders['x-mocked-by'] = 'proxy';

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: response.body
        ? Readable.fromWeb(response.body as unknown as NodeReadableStream)
        : undefined,
    };
  }

  private getUploadsDir(): string {
    return this.configService.get<string>('app.uploadsDir', 'uploads');
  }
}
