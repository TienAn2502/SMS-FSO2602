import { Module } from '@nestjs/common';

import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { NotificationsGateway } from '@/modules/notifications/notifications.gateway';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { FilesModule } from '@/modules/files/files.module';
import { CommonModule } from '@/common/auth/common.module';
import { RedisModule } from '@/common/database/redis.module';
import { PushSubscriptionsModule } from '@/modules/push-subscriptions/push-subscriptions.module';

@Module({
  imports: [FilesModule, CommonModule, RedisModule, PushSubscriptionsModule],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
