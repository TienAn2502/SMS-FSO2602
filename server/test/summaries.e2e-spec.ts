import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Summaries API (e2e)', () => {
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

  it('GET /api/v1/conduct-records without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/conduct-records')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/grade-summaries/subject-results without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/grade-summaries/subject-results')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/grade-summaries/recompute without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/grade-summaries/recompute')
      .send({ semesterId: '00000000-0000-4000-8000-000000000001' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/grade-summaries/semesters/:semesterId/finalize-readiness without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/grade-summaries/semesters/00000000-0000-4000-8000-000000000001/finalize-readiness',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/grade-summaries/semesters/:semesterId/finalize-all without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/grade-summaries/semesters/00000000-0000-4000-8000-000000000001/finalize-all',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/grade-summaries/academic-years/:id/finalize-promotion-readiness without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/grade-summaries/academic-years/00000000-0000-4000-8000-000000000001/finalize-promotion-readiness',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/grade-summaries/academic-years/:id/finalize-promotion-all without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/grade-summaries/academic-years/00000000-0000-4000-8000-000000000001/finalize-promotion-all',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-summaries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-summaries')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-homeroom/conduct-records without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-homeroom/conduct-records')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
