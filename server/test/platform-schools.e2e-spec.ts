import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import { setupApp } from '@/setup-app';

const SYSTEM_ADMIN_EMAIL =
  process.env.SEED_SYSTEM_ADMIN_EMAIL ?? 'system_admin@demo.edu.vn';
const SYSTEM_ADMIN_PASSWORD =
  process.env.SEED_SYSTEM_ADMIN_PASSWORD ?? 'SystemAdmin@123456';
const SCHOOL_ADMIN_EMAIL =
  process.env.SEED_SCHOOL_ADMIN_EMAIL ?? 'school_admin@demo.edu.vn';
const SCHOOL_ADMIN_PASSWORD =
  process.env.SEED_SCHOOL_ADMIN_PASSWORD ?? 'SchoolAdmin@123456';

async function loginAs(
  app: INestApplication<App>,
  email: string,
  password: string,
) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  return agent;
}

describe('Platform schools API (e2e)', () => {
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

  it('GET /api/v1/platform/schools without auth returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/platform/schools')
      .expect(401);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/platform/schools as school admin returns 403', async () => {
    const agent = await loginAs(app, SCHOOL_ADMIN_EMAIL, SCHOOL_ADMIN_PASSWORD);

    const res = await agent.get('/api/v1/platform/schools').expect(403);

    const body = res.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('PLATFORM_FORBIDDEN');
  });

  it('GET /api/v1/platform/schools as system admin returns 200', async () => {
    const agent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );

    const res = await agent.get('/api/v1/platform/schools').expect(200);

    const body = res.body as {
      success: boolean;
      data: unknown[];
      meta: { total: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('POST /platform/schools creates school + admin and school admin can login', async () => {
    const agent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );

    const uniqueSuffix = Date.now();
    const schoolCode = `E2E_${uniqueSuffix}`;
    const adminEmail = `e2e_admin_${uniqueSuffix}@demo.edu.vn`;

    const createRes = await agent
      .post('/api/v1/platform/schools')
      .send({
        code: schoolCode,
        name: `Trường E2E ${uniqueSuffix}`,
        schoolType: 'THPT',
        adminEmail,
        adminPassword: 'E2eAdmin@123456',
        adminFullName: 'E2E Admin',
      })
      .expect(201);

    const createBody = createRes.body as {
      success: boolean;
      data: {
        school: { code: string; status: string };
        admin: { email: string; role: string };
        seededGradeLevelCount: number;
      };
    };

    expect(createBody.success).toBe(true);
    expect(createBody.data.school.code).toBe(schoolCode);
    expect(createBody.data.school.status).toBe('ACTIVE');
    expect(createBody.data.admin.email).toBe(adminEmail);
    expect(createBody.data.admin.role).toBe('SCHOOL_ADMIN');
    expect(createBody.data.seededGradeLevelCount).toBe(3);

    const schoolAdminAgent = request.agent(app.getHttpServer());
    await schoolAdminAgent
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'E2eAdmin@123456' })
      .expect(200);

    const currentRes = await schoolAdminAgent
      .get('/api/v1/schools/current')
      .expect(200);

    const currentBody = currentRes.body as {
      success: boolean;
      data: { code: string };
    };
    expect(currentBody.data.code).toBe(schoolCode);

    const gradeLevelsRes = await schoolAdminAgent
      .get('/api/v1/grade-levels')
      .expect(200);

    const gradeLevelsBody = gradeLevelsRes.body as {
      success: boolean;
      data: Array<{ code: string }>;
    };
    expect(gradeLevelsBody.data.map((item) => item.code).sort()).toEqual([
      '10',
      '11',
      '12',
    ]);
  });

  it('PATCH status SUSPENDED blocks school admin login', async () => {
    const sysAgent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );

    const uniqueSuffix = Date.now();
    const schoolCode = `E2E_SUSP_${uniqueSuffix}`;
    const adminEmail = `e2e_susp_${uniqueSuffix}@demo.edu.vn`;
    const adminPassword = 'E2eAdmin@123456';

    const createRes = await sysAgent
      .post('/api/v1/platform/schools')
      .send({
        code: schoolCode,
        name: `Trường suspend E2E ${uniqueSuffix}`,
        adminEmail,
        adminPassword,
      })
      .expect(201);

    const schoolId = (
      createRes.body as { data: { school: { id: string } } }
    ).data.school.id;

    await sysAgent
      .patch(`/api/v1/platform/schools/${schoolId}/status`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(403);

    const body = loginRes.body as { success: boolean; code: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('SCHOOL_SUSPENDED');
  });
});
