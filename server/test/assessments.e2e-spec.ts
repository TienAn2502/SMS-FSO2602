import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Assessments API (e2e)', () => {
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

  it('GET /api/v1/assessments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/assessments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/assessments/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/assessments/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

describe('Portal Gradebook API (e2e)', () => {
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

  it('GET /api/v1/portal/my-gradebook-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-gradebook-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/portal/my-gradebook-classes/:id/scores without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        '/api/v1/portal/my-gradebook-classes/00000000-0000-4000-8000-000000000001/scores',
      )
      .send({
        changes: [
          {
            assessmentId: '00000000-0000-4000-8000-000000000002',
            studentId: '00000000-0000-4000-8000-000000000003',
            score: 8,
          },
        ],
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-scores/grid without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-scores/grid')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
