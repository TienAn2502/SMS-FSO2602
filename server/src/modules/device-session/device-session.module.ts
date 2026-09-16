import { Module } from '@nestjs/common';
import { DeviceSessionService } from './device-session.service';
import { DeviceSessionController } from './device-session.controller';
import { PrismaModule } from '@/common/database/prisma.module';
import { UaService } from '@/modules/device-session/ua.service';
import { RedisModule } from '@/common/database/redis.module';
import { SessionCleanupCronService } from '@/modules/device-session/device-session-cleanup.service';

@Module({
  controllers: [DeviceSessionController],
  providers: [DeviceSessionService, UaService, SessionCleanupCronService],
  imports: [PrismaModule, RedisModule],
  exports: [UaService, DeviceSessionService],
})
export class DeviceSessionModule {}
