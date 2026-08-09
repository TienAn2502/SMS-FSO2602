import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/common/database/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const databaseConnected = await this.prisma.ping();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
