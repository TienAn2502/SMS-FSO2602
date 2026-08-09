import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Academic API (e2e)', () => {
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

  it('GET /api/v1/academic-years without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academic-years')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/academic-years/current without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academic-years/current')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/academic-years without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/academic-years')
      .send({
        name: '2026-2027',
        code: '2026-27',
        startDate: '2026-09-01',
        endDate: '2027-05-31',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/academic-years/:yearId/semesters without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/academic-years/00000000-0000-4000-8000-000000000001/semesters',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/academic-years/:yearId/semesters without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/academic-years/00000000-0000-4000-8000-000000000001/semesters',
      )
      .send({
        name: 'Học kỳ 1',
        code: 'HK1',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/semesters/current without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/semesters/current')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/academic-years/:yearId/semesters/:id/set-current without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        '/api/v1/academic-years/00000000-0000-4000-8000-000000000001/semesters/00000000-0000-4000-8000-000000000002/set-current',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/grade-levels without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/grade-levels')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/grade-levels without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/grade-levels')
      .send({ name: 'Khối 10', code: '10' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/subjects without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/subjects')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/subjects without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .send({ code: 'TOAN', name: 'Toán học' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
