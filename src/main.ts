import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const swaggerPath = configService.get<string>('app.swaggerPath', 'docs');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const corsOrigin = configService.get<string>(
    'app.corsOrigin',
    'http://localhost:5173',
  );
  const uploadsDir = resolve(
    configService.get<string>('app.uploadsDir', 'uploads'),
  );
  const cookieName = configService.get<string>(
    'app.cookieName',
    'access_token',
  );

  await mkdir(join(uploadsDir, 'avatars'), { recursive: true });

  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart Mock Proxy')
    .setDescription(
      'API сервиса Smart Mock Proxy: mock-ответы и проксирование на стенды',
    )
    .setVersion('0.1.0')
    .addCookieAuth(cookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document);

  await app.init();

  // Разрешаем пустой body при Content-Type: application/json (например logout).
  const fastify = app.getHttpAdapter().getInstance();
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        const json: unknown = raw === '' ? {} : JSON.parse(raw);
        done(null, json);
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  await app.listen(port, '0.0.0.0');

  console.log(
    `Smart Mock Proxy [${nodeEnv}] запущен на http://localhost:${port}/${apiPrefix}`,
  );
  console.log(`Swagger: http://localhost:${port}/${swaggerPath}`);
}

void bootstrap();
