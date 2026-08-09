import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Student Enrollments API (e2e)', () => {
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

  it('GET /api/v1/student-enrollments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/student-enrollments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/student-enrollments/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/student-enrollments/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/student-enrollments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/student-enrollments')
      .send({
        studentId: '00000000-0000-4000-8000-000000000001',
        semesterId: '00000000-0000-4000-8000-000000000002',
        homeroomClassId: '00000000-0000-4000-8000-000000000003',
        enrolledAt: '2025-08-05',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/student-enrollments/:id/transfer without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/student-enrollments/00000000-0000-4000-8000-000000000001/transfer',
      )
      .send({
        targetHomeroomClassId: '00000000-0000-4000-8000-000000000002',
        transferredAt: '2025-12-16',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/student-enrollments/:id/withdraw without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        '/api/v1/student-enrollments/00000000-0000-4000-8000-000000000001/withdraw',
      )
      .send({ leftAt: '2025-12-20' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/student-enrollments/copy-from-semester without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/student-enrollments/copy-from-semester')
      .send({
        sourceSemesterId: '00000000-0000-4000-8000-000000000001',
        targetSemesterId: '00000000-0000-4000-8000-000000000002',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/student-enrollments/close-semester without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/student-enrollments/close-semester')
      .send({
        semesterId: '00000000-0000-4000-8000-000000000001',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/student-enrollments/sync-stale without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/student-enrollments/sync-stale')
      .send({
        academicYearId: '00000000-0000-4000-8000-000000000001',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/students/:studentId/enrollments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/students/00000000-0000-4000-8000-000000000001/enrollments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
