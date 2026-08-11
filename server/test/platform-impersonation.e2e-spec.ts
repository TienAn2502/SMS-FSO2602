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

describe('Platform impersonation (e2e)', () => {
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

  it('school admin cannot start impersonation', async () => {
    const sysAgent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );
    const listRes = await sysAgent.get('/api/v1/platform/schools').expect(200);
    const demo = (
      listRes.body as {
        data: Array<{ id: string; code: string }>;
      }
    ).data.find((school) => school.code === 'DEMO');
    expect(demo).toBeDefined();

    const schoolAgent = await loginAs(
      app,
      SCHOOL_ADMIN_EMAIL,
      SCHOOL_ADMIN_PASSWORD,
    );

    const res = await schoolAgent
      .post(`/api/v1/platform/schools/${demo!.id}/impersonate`)
      .send({ mode: 'read_only' })
      .expect(403);

    expect((res.body as { code: string }).code).toBe('PLATFORM_FORBIDDEN');
  });

  it('system admin can impersonate ACTIVE school, access grade-levels, then end', async () => {
    const agent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );

    const listRes = await agent.get('/api/v1/platform/schools').expect(200);
    const demo = (
      listRes.body as {
        data: Array<{ id: string; code: string; status: string }>;
      }
    ).data.find((school) => school.code === 'DEMO');

    expect(demo).toBeDefined();
    expect(demo!.status).toBe('ACTIVE');

    const startRes = await agent
      .post(`/api/v1/platform/schools/${demo!.id}/impersonate`)
      .send({ mode: 'read_only' })
      .expect(200);

    const startBody = startRes.body as {
      success: boolean;
      data: {
        impersonation: {
          targetSchoolId: string;
          mode: string;
        };
        redirectTo: string;
      };
    };

    expect(startBody.success).toBe(true);
    expect(startBody.data.impersonation.targetSchoolId).toBe(demo!.id);
    expect(startBody.data.impersonation.mode).toBe('read_only');
    expect(startBody.data.redirectTo).toBe('/');

    const meRes = await agent.get('/api/v1/auth/me').expect(200);
    const meBody = meRes.body as {
      data: {
        activeSchoolId: string;
        impersonation: { targetSchoolId: string } | null;
      };
    };
    expect(meBody.data.activeSchoolId).toBe(demo!.id);
    expect(meBody.data.impersonation?.targetSchoolId).toBe(demo!.id);

    await agent.get('/api/v1/grade-levels').expect(200);

    const createBlocked = await agent
      .post('/api/v1/grade-levels')
      .send({ code: 'E2E', name: 'Khối E2E' })
      .expect(403);
    expect((createBlocked.body as { code: string }).code).toBe(
      'IMPERSONATION_READ_ONLY',
    );

    const endRes = await agent
      .post('/api/v1/platform/impersonation/end')
      .expect(200);

    const endBody = endRes.body as {
      data: { ended: boolean; redirectTo: string };
    };
    expect(endBody.data.ended).toBe(true);
    expect(endBody.data.redirectTo).toBe('/platform');

    const meAfter = await agent.get('/api/v1/auth/me').expect(200);
    const meAfterBody = meAfter.body as {
      data: {
        activeSchoolId: string | null;
        activeSchool: { code: string } | null;
        impersonation: unknown;
      };
    };
    expect(meAfterBody.data.activeSchool).toBeNull();
    expect(meAfterBody.data.activeSchoolId).toBeNull();
    expect(meAfterBody.data.impersonation).toBeNull();
  });

  it('cannot impersonate suspended school', async () => {
    const agent = await loginAs(
      app,
      SYSTEM_ADMIN_EMAIL,
      SYSTEM_ADMIN_PASSWORD,
    );

    const uniqueSuffix = Date.now();
    const createRes = await agent
      .post('/api/v1/platform/schools')
      .send({
        code: `E2E_IMP_${uniqueSuffix}`,
        name: `Trường impersonate E2E ${uniqueSuffix}`,
        schoolType: 'THPT',
        adminEmail: `e2e_imp_${uniqueSuffix}@demo.edu.vn`,
        adminPassword: 'E2eAdmin@123456',
      })
      .expect(201);

    const schoolId = (
      createRes.body as { data: { school: { id: string } } }
    ).data.school.id;

    await agent
      .patch(`/api/v1/platform/schools/${schoolId}/status`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    const res = await agent
      .post(`/api/v1/platform/schools/${schoolId}/impersonate`)
      .send({ mode: 'read_only' })
      .expect(403);

    expect((res.body as { code: string }).code).toBe('SCHOOL_NOT_ACTIVE');
  });
});
