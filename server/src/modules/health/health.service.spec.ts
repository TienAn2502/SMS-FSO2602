import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@/common/database/prisma.service';
import { HealthService } from '@/modules/health/health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('returns ok when database is connected', async () => {
    prisma.ping.mockResolvedValue(true);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toBeDefined();
  });

  it('returns degraded when database is disconnected', async () => {
    prisma.ping.mockResolvedValue(false);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
  });
});
