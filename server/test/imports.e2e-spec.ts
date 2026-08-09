import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Imports API (e2e)', () => {
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

  it('GET /api/v1/imports/templates/students without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/imports/templates/students')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/imports/students without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/students')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/students without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/students')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/imports/templates/teachers without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/imports/templates/teachers')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/imports/teachers without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/teachers')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/teachers without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/teachers')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/imports/templates/parents without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/imports/templates/parents')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/imports/parents without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/parents')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/parents without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/parents')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/imports/templates/homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/imports/templates/homeroom-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/imports/homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/homeroom-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/homeroom-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/imports/templates/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/imports/templates/teaching-assignments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/imports/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/teaching-assignments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/teaching-assignments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/enrollments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/enrollments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/semester-summaries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/semester-summaries')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/year-summaries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/year-summaries')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/attendance without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/attendance')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/exports/timetable without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/exports/timetable?format=xlsx')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
