import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

describe('Files API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/files/upload without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/files/upload')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/files/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/files/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/files/:id/url without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/files/00000000-0000-4000-8000-000000000001/url')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('DELETE /api/v1/files/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/files/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
