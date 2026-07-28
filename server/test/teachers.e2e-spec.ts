import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

describe('Teachers API (e2e)', () => {
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

  it('GET /api/v1/teachers without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/teachers')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/teachers/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/teachers/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/teachers without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teachers')
      .send({
        fullName: 'Nguyễn Văn Giáo',
        specialization: 'Toán học',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/teachers/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/teachers/00000000-0000-4000-8000-000000000001')
      .send({ fullName: 'Updated Name' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/teachers/:id/status without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/teachers/00000000-0000-4000-8000-000000000001/status')
      .send({ status: 'INACTIVE' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/teachers/:id/link-user without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teachers/00000000-0000-4000-8000-000000000001/link-user')
      .send({ userId: '00000000-0000-4000-8000-000000000002' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/teachers/:id/create-user without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teachers/00000000-0000-4000-8000-000000000001/create-user')
      .send({
        email: 'newteacher@demo.edu.vn',
        password: 'Temp@123456',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
