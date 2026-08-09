import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Portal API (e2e)', () => {
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

  it('GET /api/v1/portal/me without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/me')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-homeroom-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-student-profile without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-student-profile')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-class-timetable without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-class-timetable')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-attendance-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-attendance-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/attendance-sessions/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/portal/attendance-sessions/00000000-0000-4000-8000-000000000001',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/portal/attendance-sessions without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/portal/attendance-sessions')
      .send({
        courseSectionId: '00000000-0000-4000-8000-000000000001',
        sessionDate: '2025-09-01',
        periodNumber: 1,
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PUT /api/v1/portal/attendance-sessions/:id/records without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .put(
        '/api/v1/portal/attendance-sessions/00000000-0000-4000-8000-000000000001/records',
      )
      .send({
        records: [
          {
            studentId: '00000000-0000-4000-8000-000000000002',
            status: 'PRESENT',
          },
        ],
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-attendance without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-attendance')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-children/:id/attendance without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/portal/my-children/00000000-0000-4000-8000-000000000001/attendance',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-gradebook-classes/:id/scores/import-template without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/portal/my-gradebook-classes/00000000-0000-4000-8000-000000000001/scores/import-template',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/portal/my-gradebook-classes/:id/scores/import without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/portal/my-gradebook-classes/00000000-0000-4000-8000-000000000001/scores/import',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-gradebook-classes/:id/export without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/portal/my-gradebook-classes/00000000-0000-4000-8000-000000000001/export?format=xlsx',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-timetable/export without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-timetable/export?format=xlsx')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/portal/my-class-timetable/export without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/my-class-timetable/export?format=xlsx')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
