import { Global, Module } from '@nestjs/common';
import { RedisService } from '@/common/database/redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
