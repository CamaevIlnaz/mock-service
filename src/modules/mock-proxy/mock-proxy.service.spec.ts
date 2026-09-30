import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpMethod, MockResponseType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MockProxyRequest, MockProxyService } from './mock-proxy.service';

const stand = {
  id: 1,
  code: 'dev',
  name: 'Dev',
  domain: 'https://dev.example.com',
  basePath: '/api',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    mockServerId: 10,
    name: 'rule',
    method: HttpMethod.GET,
    urlMask: '/products',
    isEnabled: true,
    priority: 0,
    statusCode: 200,
    delayMs: 0,
    responseType: MockResponseType.INLINE_JSON,
    responseBody: { mocked: true },
    responseFileId: null,
    responseHeaders: null,
    responseFile: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildRequest(
  overrides: Partial<MockProxyRequest> = {},
): MockProxyRequest {
  return {
    connectionToken: 'token',
    method: 'GET',
    path: '/products',
    search: '?page=1',
    headers: { host: 'localhost:3000', authorization: 'Bearer abc' },
    ...overrides,
  };
}

describe('MockProxyService', () => {
  let prisma: {
    mockServer: { findUnique: jest.Mock };
    mockRule: { findMany: jest.Mock };
  };
  let service: MockProxyService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      mockServer: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, stand }),
      },
      mockRule: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    };
    service = new MockProxyService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );

    fetchMock = jest.fn().mockResolvedValue(
      new Response('{"real":true}', {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
        },
      }),
    );
    global.fetch = fetchMock;
  });

  it('возвращает 404 для неизвестного токена', async () => {
    prisma.mockServer.findUnique.mockResolvedValue(null);
    await expect(service.handle(buildRequest())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('отдаёт mock-ответ, если правило совпало', async () => {
    prisma.mockRule.findMany.mockResolvedValue([
      buildRule({
        statusCode: 418,
        responseHeaders: { 'X-Custom': '1' },
      }),
    ]);

    const result = await service.handle(buildRequest());

    expect(result.statusCode).toBe(418);
    expect(result.body).toBe('{"mocked":true}');
    expect(result.headers['x-mocked-by']).toBe('smart-mock-proxy');
    expect(result.headers['x-custom']).toBe('1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('берёт первое совпавшее правило в порядке из БД', async () => {
    prisma.mockRule.findMany.mockResolvedValue([
      buildRule({ id: 1, urlMask: '/orders', responseBody: 'orders' }),
      buildRule({ id: 2, urlMask: '/products', responseBody: 'first' }),
      buildRule({ id: 3, urlMask: '/products', responseBody: 'second' }),
    ]);

    const result = await service.handle(buildRequest());

    expect(result.body).toBe('"first"');
    expect(prisma.mockRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { mockServerId: 10, isEnabled: true, method: HttpMethod.GET },
        orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('проксирует на domain + basePath + path, если правила нет', async () => {
    const result = await service.handle(buildRequest());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dev.example.com/api/products?page=1');
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    const headers = init.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer abc');
    expect(headers.has('host')).toBe(false);

    expect(result.statusCode).toBe(201);
    expect(result.headers['x-mocked-by']).toBe('proxy');
    expect(result.headers['content-type']).toBe('application/json');
    expect(result.headers['content-encoding']).toBeUndefined();
  });

  it('не матчит правила для HEAD и сразу проксирует', async () => {
    await service.handle(buildRequest({ method: 'HEAD' }));

    expect(prisma.mockRule.findMany).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('пересылает body для POST', async () => {
    const body = Buffer.from('<xml/>');
    await service.handle(buildRequest({ method: 'POST', body }));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(body);
  });

  it('возвращает 502 для некорректного domain стенда', async () => {
    prisma.mockServer.findUnique.mockResolvedValue({
      id: 10,
      stand: { ...stand, domain: 'dev.example.com' },
    });

    await expect(service.handle(buildRequest())).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('возвращает 502, если стенд недоступен', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.handle(buildRequest())).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
