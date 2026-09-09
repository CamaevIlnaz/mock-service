import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('HealthController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer() as App)
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      info: {
        database: { status: 'up' },
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
