import { PushSubscriptionsController } from '@/modules/push-subscriptions/push-subscriptions.controller';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/push-subscriptions.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [PushSubscriptionsController],
  providers: [PushSubscriptionsService],
  exports: [PushSubscriptionsService],
})
export class PushSubscriptionsModule {}
