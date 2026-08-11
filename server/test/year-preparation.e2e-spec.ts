import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Year Preparation API (e2e)', () => {
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

  it('GET /api/v1/year-preparation/preview without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/year-preparation/preview')
      .query({
        sourceAcademicYearId: '00000000-0000-4000-8000-000000000001',
        targetAcademicYearId: '00000000-0000-4000-8000-000000000002',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/year-preparation/prepare-next-year without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/year-preparation/prepare-next-year')
      .send({
        sourceAcademicYearId: '00000000-0000-4000-8000-000000000001',
        targetAcademicYearId: '00000000-0000-4000-8000-000000000002',
        targetSemesterId: '00000000-0000-4000-8000-000000000003',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
