import { type CreateDeviceSessionInput } from './schema/index';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/database/redis.service';

@Injectable()
export class DeviceSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(
    input: CreateDeviceSessionInput,
  ): Promise<{ sessionId: string; deviceId: string }> {
    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.deviceSession.upsert({
      where: {
        userId_deviceId: {
          // Tên key unique do Prisma tự sinh ra từ @@unique([userId, deviceId])
          userId: input.userId,
          deviceId: input.deviceId,
        },
      },
      update: {
        browser: input.browser,
        os: input.os,
        ipAddress: input.ipAddress,
        deviceType: input.deviceType,
        deviceVendor: input.deviceVendor,
        deviceModel: input.deviceModel,
        expiredAt: expiredAt, // Cập nhật lại hạn mới cho phiên
      },
      create: {
        userId: input.userId,
        browser: input.browser,
        deviceId: input.deviceId,
        os: input.os,
        ipAddress: input.ipAddress,
        deviceType: input.deviceType,
        deviceVendor: input.deviceVendor,
        deviceModel: input.deviceModel,
        expiredAt: expiredAt,
      },
    });

    return {
      sessionId: result.id,
      deviceId: result.deviceId,
    };
  }

  async deleteOneDeviceSession(sessionId: string) {
    await Promise.all([
      this.prisma.deviceSession.delete({
        where: { id: sessionId },
      }),
      this.redisService.deleteOneSessionFromWhitelist(sessionId),
    ]);
  }

  async listDeviceSessions(userId: string, sessionId: string) {
    const [devices, totalCount] = await this.prisma.$transaction([
      this.prisma.deviceSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deviceSession.count({
        where: {
          userId,
          id: {
            not: sessionId,
          },
        },
      }),
    ]);
    return {
      devices,
      totalCount,
    };
  }

  async deleteManyDeviceSessions(
    userId: string,
    currentSessionId: string,
    sessionIdKeys: string[],
  ) {
    await Promise.all([
      // 1 Xóa trong DB
      this.prisma.deviceSession.deleteMany({
        where: {
          id: {
            not: currentSessionId,
          },
          userId,
        },
      }),
      // 2 Xóa whitelist trong Redis
      this.redisService.deleteManySessionFromWhitelist(new Set(sessionIdKeys)),
    ]);
  }
}
