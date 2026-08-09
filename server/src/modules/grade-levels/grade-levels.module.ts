import { Module } from '@nestjs/common';

import { GradeLevelsController } from '@/modules/grade-levels/grade-levels.controller';
import { GradeLevelsService } from '@/modules/grade-levels/grade-levels.service';

@Module({
  controllers: [GradeLevelsController],
  providers: [GradeLevelsService],
  exports: [GradeLevelsService],
})
export class GradeLevelsModule {}
