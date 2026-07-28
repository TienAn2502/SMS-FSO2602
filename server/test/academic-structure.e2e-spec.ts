import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

describe('Academic structure API (e2e)', () => {
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

  it('GET /api/v1/homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/homeroom-classes')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/homeroom-classes without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/homeroom-classes')
      .send({
        academicYearId: '00000000-0000-4000-8000-000000000001',
        gradeLevelId: '00000000-0000-4000-8000-000000000002',
        name: '10A1',
        code: '10A1',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/course-sections without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/course-sections')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/course-sections without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/course-sections')
      .send({
        semesterId: '00000000-0000-4000-8000-000000000001',
        subjectId: '00000000-0000-4000-8000-000000000002',
        homeroomClassId: '00000000-0000-4000-8000-000000000003',
        name: 'Toán 10A1',
        code: 'TOAN-10A1',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
