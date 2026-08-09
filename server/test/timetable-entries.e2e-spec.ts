import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

describe('Timetable Entries API (e2e)', () => {
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

  it('GET /api/v1/timetable-entries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/timetable-entries')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/timetable-entries/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/timetable-entries/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/timetable-entries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/timetable-entries')
      .send({
        courseSectionId: '00000000-0000-4000-8000-000000000001',
        teacherId: '00000000-0000-4000-8000-000000000002',
        dayOfWeek: 1,
        periodNumber: 1,
        room: 'P.201',
      })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/timetable-entries/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/timetable-entries/00000000-0000-4000-8000-000000000001')
      .send({ room: 'P.202' })
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('DELETE /api/v1/timetable-entries/:id without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/timetable-entries/00000000-0000-4000-8000-000000000001')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/course-sections/:id/timetable-entries without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/course-sections/00000000-0000-4000-8000-000000000001/timetable-entries',
      )
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
