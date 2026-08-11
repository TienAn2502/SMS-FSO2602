import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Class Placement API (e2e)', () => {
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

  it('GET /api/v1/class-placement/unassigned without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/class-placement/unassigned')
      .query({
        semesterId: '00000000-0000-4000-8000-000000000001',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/class-placement/assign without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/class-placement/assign')
      .send({
        semesterId: '00000000-0000-4000-8000-000000000001',
        assignments: [
          {
            studentId: '00000000-0000-4000-8000-000000000002',
            homeroomClassId: '00000000-0000-4000-8000-000000000003',
          },
        ],
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/class-placement/auto-balance without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/class-placement/auto-balance')
      .send({
        semesterId: '00000000-0000-4000-8000-000000000001',
        gradeLevelId: '00000000-0000-4000-8000-000000000002',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
