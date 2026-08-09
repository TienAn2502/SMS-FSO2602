import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Teaching Assignments API (e2e)', () => {
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

  it('GET /api/v1/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/teaching-assignments')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/teaching-assignments/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/teaching-assignments/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teaching-assignments')
      .send({
        teacherId: '00000000-0000-4000-8000-000000000001',
        courseSectionId: '00000000-0000-4000-8000-000000000002',
        assignAt: '2025-08-01',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/teaching-assignments/:id/status without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        '/api/v1/teaching-assignments/00000000-0000-4000-8000-000000000001/status',
      )
      .send({ status: 'INACTIVE' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/teaching-assignments/copy-from-semester without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teaching-assignments/copy-from-semester')
      .send({
        sourceSemesterId: '00000000-0000-4000-8000-000000000001',
        targetSemesterId: '00000000-0000-4000-8000-000000000002',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/teachers/:teacherId/teaching-assignments without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/teachers/00000000-0000-4000-8000-000000000001/teaching-assignments',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
